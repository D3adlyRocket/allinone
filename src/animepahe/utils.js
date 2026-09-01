import { MAIN_URL, ANIMEPAHE_DOMAINS, TMDB_API_KEY, HEADERS } from './constants.js';

let activeDomain = MAIN_URL;

export async function fetchText(url, options = {}) {
    const isAbsolute = url.startsWith('http');
    const urlsToTry = isAbsolute ? [url] : ANIMEPAHE_DOMAINS.map(d => `${d}${url.startsWith('/') ? '' : '/'}${url}`);

    let lastError = null;
    for (const tryUrl of urlsToTry) {
        try {
            const isPaheUrl = tryUrl.includes('animepahe.');
            const mergedHeaders = {
                ...HEADERS,
                "Referer": `${activeDomain}/`,
                ...(options.headers || {})
            };

            let response = await fetch(tryUrl, {
                headers: mergedHeaders,
                cfKiller: isPaheUrl,
                skipSizeCheck: true,
                ...options
            });

            if ((response.status === 403 || response.status === 503) && typeof Cloudflare !== 'undefined' && Cloudflare.solve) {
                try {
                    const solvedHeaders = await Cloudflare.solve(tryUrl);
                    if (solvedHeaders['Cookie']) mergedHeaders['Cookie'] = solvedHeaders['Cookie'];
                    if (solvedHeaders['User-Agent']) mergedHeaders['User-Agent'] = solvedHeaders['User-Agent'];

                    response = await fetch(tryUrl, {
                        headers: mergedHeaders,
                        skipSizeCheck: true,
                        ...options
                    });
                } catch (_) {}
            }

            if (response.ok) {
                if (!isAbsolute) {
                    const match = tryUrl.match(/^(https?:\/\/[^\/]+)/);
                    if (match) activeDomain = match[1];
                }
                return await response.text();
            }
            lastError = new Error(`HTTP ${response.status} on ${tryUrl}`);
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error(`Failed to fetch: ${url}`);
}

export async function fetchJson(url, options = {}) {
    const text = await fetchText(url, options);
    return JSON.parse(text);
}

export async function getImdbId(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.imdb_id;
    } catch (_) {
        return null;
    }
}

export async function resolveMapping(imdbId, season, episode) {
    try {
        const url = `https://id-mapping-api-malid.hf.space/api/resolve?id=${imdbId}&s=${season}&e=${episode}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (_) {
        return null;
    }
}

export async function getMalTitle(malId) {
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.data?.title || data.data?.title_english;
    } catch (_) {
        return null;
    }
}

export async function searchAnime(query, page = 1) {
    const timeSuffix = Math.floor(Date.now() / 1000) + (page * 3);
    const url = `/api?m=search&l=8&q=${encodeURIComponent(query + ' ' + timeSuffix)}&page=${page}`;
    return await fetchJson(url);
}

export function extractQuality(text) {
    const match = text.match(/(\d{3,4}p)/);
    return match ? match[1] : "720p";
}
