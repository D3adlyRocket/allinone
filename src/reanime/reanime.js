import cheerio from 'cheerio-without-node-native';
import { HEADERS, REANIME_BASE, REANIME_DOMAINS, TMDB_API_KEY, ANILIST_URL, ARM_BASE, CINEMETA_URL } from './constants.js';

let activeBaseUrl = REANIME_BASE;

function absolutize(path, base = activeBaseUrl) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
}

export async function fetchText(url, options = {}) {
    const isAbsolute = url.startsWith("http");
    const urlsToTry = isAbsolute ? [url] : REANIME_DOMAINS.map(domain => absolutize(url, domain));

    let lastError = null;
    for (const tryUrl of urlsToTry) {
        try {
            const response = await fetch(tryUrl, {
                ...options,
                headers: {
                    ...HEADERS,
                    ...(options.headers || {})
                },
                cfKiller: true,
                skipSizeCheck: true
            });
            if (response.ok) {
                if (!isAbsolute) {
                    const match = tryUrl.match(/^(https?:\/\/[^\/]+)/);
                    if (match) activeBaseUrl = match[1];
                }
                return await response.text();
            }
            lastError = new Error(`Reanime HTTP ${response.status}: ${tryUrl}`);
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error(`Failed to fetch: ${url}`);
}

async function fetchJson(url, options = {}) {
    const text = await fetchText(url, {
        ...options,
        headers: {
            "Accept": "application/json, text/plain, */*",
            ...(options.headers || {})
        }
    });
    return JSON.parse(text);
}

export async function getTmdbInfo(tmdbId, mediaType) {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    try {
        const data = await fetchJson(url);
        return {
            title: data.name || data.title || data.original_name || data.original_title || "",
            year: ((data.first_air_date || data.release_date || "").match(/\d{4}/) || [null])[0],
            imdbId: data.external_ids && data.external_ids.imdb_id
        };
    } catch (e) {
        return { title: "", year: null, imdbId: null };
    }
}

export async function getAnilistInfo(alId) {
    const query = 'query($id:Int){Media(id:$id){id title{english romaji} startDate{year}}}';
    try {
        const json = await fetchJson(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { id: parseInt(alId, 10) } })
        });
        const media = json.data?.Media;
        if (!media) return { title: "", year: null };
        return {
            title: media.title?.english || media.title?.romaji || "",
            year: media.startDate?.year || null
        };
    } catch (e) {
        return { title: "", year: null };
    }
}

export async function getSyncInfo(id, mediaType, season, episode) {
    const isImdb = typeof id === 'string' && id.indexOf('tt') === 0;

    const getCinemetaInfo = async (imdbId) => {
        const type = (mediaType === 'movie') ? 'movie' : 'series';
        const url = `${CINEMETA_URL}/${type}/${imdbId}.json`;
        try {
            const data = await fetchJson(url);
            const meta = data.meta;
            if (!meta) throw new Error('No Cinemeta metadata');
            if (mediaType === 'movie') return { date: meta.released ? meta.released.split('T')[0] : null, title: meta.name, dayIndex: 1 };
            
            const videos = meta.videos || [];
            const target = videos.find(v => v.season == season && v.episode == episode);
            if (!target || !target.released) return { date: null, title: null, dayIndex: 1 };

            const targetDate = target.released.split('T')[0];
            const dayIndex = videos.filter(v => v.season == season && v.released && v.released.split('T')[0] === targetDate && parseInt(v.episode) < parseInt(episode)).length + 1;

            return { date: targetDate, title: target.name || null, dayIndex };
        } catch (e) {
            return { date: null, title: null, dayIndex: 1 };
        }
    };

    if (isImdb) {
        const info = await getCinemetaInfo(id);
        if (info.date) return { imdbId: id, releaseDate: info.date, episodeTitle: info.title, dayIndex: info.dayIndex, episode };
        throw new Error('Could not find release date on Cinemeta');
    }

    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const details = await fetchJson(tmdbUrl);

    let imdbId = (details.external_ids && details.external_ids.imdb_id) || details.imdb_id || null;
    const title = details.name || details.title || null;

    if (!imdbId) {
        try {
            const armData = await fetchJson(`${ARM_BASE}/themoviedb?id=${id}`);
            imdbId = (Array.isArray(armData) && armData.length > 0) ? armData[0].imdb : null;
        } catch (e) {}
    }

    if (!imdbId) throw new Error(`No IMDb ID found for TMDB ${id}`);
    
    const cMeta = await getCinemetaInfo(imdbId);
    let finalDate = cMeta.date;
    if (mediaType === 'movie' && details.release_date) finalDate = details.release_date;

    if (!finalDate) throw new Error(`Could not find release date for ID ${imdbId}`);

    return {
        imdbId,
        tmdbId: id,
        releaseDate: finalDate,
        title,
        episodeTitle: cMeta.title,
        dayIndex: cMeta.dayIndex,
        episode
    };
}

export async function resolveByDate(releaseDateStr, showTitle, originalEpisode, episodeTitle, dayIndex) {
    if (!releaseDateStr || !/^\d{4}-\d{2}-\d{2}/.test(releaseDateStr)) return null;

    const query = 'query($search:String){Page(perPage:20){media(search:$search,type:ANIME){id type format title{romaji english}startDate{year month day}endDate{year month day}episodes streamingEpisodes{title}}}}';
    
    try {
        const json = await fetchJson(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { search: showTitle } })
        });

        const candidates = json.data?.Page?.media || [];
        if (candidates.length === 0) return null;

        const targetDate = new Date(releaseDateStr);

        for (const anime of candidates) {
            const s = anime.startDate;
            const startStr = (s.year && s.month && s.day) ? `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}` : null;
            if (!startStr) continue;

            const startDate = new Date(startStr);
            const diffDays = Math.ceil(Math.abs(targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            let isMatch = false;
            if (anime.format === 'MOVIE' || anime.format === 'SPECIAL' || anime.episodes === 1) {
                if (diffDays <= 2) isMatch = true;
            } else {
                const startLimit = new Date(startDate);
                startLimit.setDate(startLimit.getDate() - 2);
                if (targetDate >= startLimit) {
                    if (anime.endDate && anime.endDate.year) {
                        const endDate = new Date(anime.endDate.year, (anime.endDate.month || 12) - 1, (anime.endDate.day || 31));
                        endDate.setDate(endDate.getDate() + 2);
                        if (targetDate <= endDate) isMatch = true;
                    } else {
                        isMatch = true;
                    }
                }
            }

            if (isMatch) {
                const isTV = anime.format !== 'MOVIE' && anime.format !== 'SPECIAL' && anime.episodes !== 1;
                let episodeNum = (isTV && originalEpisode) ? originalEpisode : (dayIndex || 1);
                
                const episodes = anime.streamingEpisodes || [];
                if (episodes.length > 1 && episodeTitle) {
                    const cleanTarget = episodeTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                    for (let j = 0; j < episodes.length; j++) {
                        const cleanAl = (episodes[j].title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (cleanAl && (cleanAl.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(cleanAl) !== -1)) {
                            episodeNum = j + 1;
                            break;
                        }
                    }
                }
                return { alId: anime.id, episode: episodeNum, title: anime.title.english || anime.title.romaji };
            }
        }
    } catch (e) {
        console.error(`[AniList] Search error: ${e.message}`);
    }
    return null;
}

function normalizeTitle(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function scoreCandidate(title, query, year, targetAnilistId, candidateAnilistId) {
    if (targetAnilistId && candidateAnilistId && String(targetAnilistId) === String(candidateAnilistId)) {
        return 1000;
    }

    const a = normalizeTitle(title);
    const b = normalizeTitle(query);
    if (!a || !b) return 0;
    let score = 0;
    if (a === b) score += 100;
    if (a.includes(b) || b.includes(a)) score += 50;
    const words = b.split(/\s+/).filter(Boolean);
    for (const word of words) if (a.includes(word)) score += 4;
    if (year && String(title).includes(String(year))) score += 10;
    return score;
}

function extractAnilistId(item) {
    const direct = item && (item.anilist_id || item.anilistId);
    if (direct) return String(direct);

    const imageUrls = [
        item?.cover_image?.extra_large,
        item?.cover_image?.large,
        item?.cover_image?.medium,
        item?.banner_image
    ].filter(Boolean);

    for (const url of imageUrls) {
        const match = String(url).match(/\/b?x?(\d+)-|\/(\d+)[-.]/);
        if (match) return match[1] || match[2];
    }
    return null;
}

export async function searchReanimeAnime(query, year, targetAnilistId = null) {
    const endpoints = [
        `/api/v1/search?q=${encodeURIComponent(query)}&limit=36`,
        `/api/search?q=${encodeURIComponent(query)}`
    ];

    const candidates = [];
    for (const endpoint of endpoints) {
        try {
            const text = await fetchText(endpoint);
            if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
                const json = JSON.parse(text);
                const list = json.results || json.data || json.anime || (Array.isArray(json) ? json : null);
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        const rawSlug = item.anime_id || item.slug || item.id || item.url;
                        if (rawSlug) {
                            const cleanSlug = String(rawSlug).replace(/-[a-z0-9]{6}$/, '');
                            const rawTitle = typeof item.title === 'object'
                                ? (item.title?.english || item.title?.romaji || item.title?.native || cleanSlug)
                                : (item.title || item.name || cleanSlug);
                            const alId = extractAnilistId(item);
                            candidates.push({
                                slug: String(rawSlug),
                                cleanSlug: cleanSlug,
                                title: rawTitle,
                                anilistId: alId,
                                score: scoreCandidate(rawTitle, query, year, targetAnilistId, alId)
                            });
                        }
                    });
                }
            }
        } catch (_) {}
        if (candidates.some(c => c.score >= 1000)) break;
        if (candidates.length > 0 && !targetAnilistId) break;
    }

    const unique = [];
    const seen = new Set();
    for (const candidate of candidates) {
        if (!candidate.slug || seen.has(candidate.slug)) continue;
        seen.add(candidate.slug);
        unique.push(candidate);
    }

    unique.sort((a, b) => b.score - a.score);
    return unique.length > 0 ? unique[0] : null;
}

export async function getFlixEmbeds(slug, episodeNumber, language, anilistId) {
    const watchPath = `/watch/${slug || 'anime'}?ep=${episodeNumber}`;

    if (anilistId) {
        try {
            const flixUrl = `/api/flix/${anilistId}/${episodeNumber}`;
            const json = await fetchJson(flixUrl, {
                headers: { "Referer": absolutize(watchPath) }
            });
            if (json.success && Array.isArray(json.servers) && json.servers.length > 0) {
                const filtered = json.servers.filter(s => !language || !s.dataType || s.dataType === language);
                return {
                    watchUrl: absolutize(watchPath),
                    servers: filtered.length > 0 ? filtered : json.servers,
                    embeds: (filtered.length > 0 ? filtered : json.servers).map(s => s.dataLink).filter(Boolean)
                };
            }
        } catch (_) {}
    }

    if (slug) {
        try {
            const html = await fetchText(`/anime/${slug}?_ep=${episodeNumber}`);
            const anilistMatch = html.match(/anilist_id:\s*(\d+)/);
            if (anilistMatch) {
                const alId = anilistMatch[1];
                const flixUrl = `/api/flix/${alId}/${episodeNumber}`;
                const json = await fetchJson(flixUrl, {
                    headers: { "Referer": absolutize(watchPath) }
                });
                if (json.success && Array.isArray(json.servers) && json.servers.length > 0) {
                    const filtered = json.servers.filter(s => !language || !s.dataType || s.dataType === language);
                    return {
                        watchUrl: absolutize(watchPath),
                        servers: filtered.length > 0 ? filtered : json.servers,
                        embeds: (filtered.length > 0 ? filtered : json.servers).map(s => s.dataLink).filter(Boolean)
                    };
                }
            }
        } catch (_) {}
    }

    return { watchUrl: absolutize(watchPath), servers: [], embeds: [] };
}
