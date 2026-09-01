import cheerio from 'cheerio-without-node-native';
import { fetchJson, fetchText, searchAnime, extractQuality, getImdbId, resolveMapping, getMalTitle } from './utils.js';
import { extractKwik, extractPahe } from './extractors.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        let animeSession = null;
        let animeTitle = "";
        let mappedEp = episode;
        let targetMalId = null;

        if (mediaType === 'tv') {
            const imdbId = await getImdbId(tmdbId, mediaType);
            if (!imdbId) return [];

            const mapping = await resolveMapping(imdbId, season, episode);
            if (!mapping || !mapping.mal_id) return [];

            targetMalId = mapping.mal_id;
            mappedEp = mapping.mal_episode || episode;
            animeTitle = await getMalTitle(targetMalId);

            if (!animeTitle) return [];

            const searchResults = await searchAnime(animeTitle);
            if (searchResults.data && searchResults.data.length > 0) {
                for (let i = 0; i < Math.min(searchResults.data.length, 5); i++) {
                    const item = searchResults.data[i];
                    try {
                        const pageHtml = await fetchText(`/anime/${item.session}`);
                        if (pageHtml.includes(`myanimelist.net/anime/${targetMalId}`) || (item.id && String(item.id) === String(targetMalId))) {
                            animeSession = item.session;
                            break;
                        }
                    } catch (_) {}
                }
                if (!animeSession && searchResults.data.length > 0) {
                    animeSession = searchResults.data[0].session;
                }
            }
        } else {
            const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=439c478a771f35c05022f9feabcca01c`;
            const tmdbRes = await fetch(tmdbUrl);
            const tmdbData = await tmdbRes.json();
            animeTitle = tmdbData.title || tmdbData.original_title;
            mappedEp = 1;

            if (!animeTitle) return [];

            const searchResults = await searchAnime(animeTitle);
            if (searchResults.data && searchResults.data.length > 0) {
                const match = searchResults.data.find(r => r.title.toLowerCase() === animeTitle.toLowerCase()) || searchResults.data[0];
                animeSession = match.session;
            }
        }

        if (!animeSession) return [];

        const firstPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=1`;
        const firstPageData = await fetchJson(firstPageUrl);
        if (!firstPageData.data || firstPageData.data.length === 0) return [];

        const paheEpStart = Math.floor(firstPageData.data[0].episode);
        const perPage = firstPageData.per_page || 30;
        const targetPaheEp = (paheEpStart - 1) + Number(mappedEp);

        const targetPage = Math.ceil(Number(mappedEp) / perPage) || 1;
        const targetPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${targetPage}`;
        const targetPageData = await fetchJson(targetPageUrl);

        let episodeSession = null;
        if (targetPageData && targetPageData.data) {
            const foundEp = targetPageData.data.find(e => Math.floor(e.episode) === targetPaheEp);
            if (foundEp) episodeSession = foundEp.session;
        }

        if (!episodeSession && targetPage !== 1) {
            const fallbackEp = firstPageData.data.find(e => Math.floor(e.episode) === targetPaheEp);
            if (fallbackEp) episodeSession = fallbackEp.session;
        }

        if (!episodeSession) return [];

        const playUrl = `/play/${animeSession}/${episodeSession}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);

        const streams = [];
        const promises = [];
        const seen = new Set();

        // 1. Resolution menu buttons (Kwik HLS streams)
        $('#resolutionMenu button').each((i, el) => {
            const $btn = $(el);
            const kwikUrl = $btn.attr('data-src');
            const btnText = $btn.text();
            const quality = extractQuality(btnText);
            const type = btnText.toLowerCase().includes('eng') ? 'DUB' : 'SUB';

            if (kwikUrl && kwikUrl.includes('kwik')) {
                promises.push(
                    extractKwik(kwikUrl).then(res => {
                        if (res) {
                            if (res.m3u8 && !seen.has(res.m3u8)) {
                                seen.add(res.m3u8);
                                streams.push({
                                    name: `AnimePahe [${type}] (${quality} HLS)`,
                                    title: mediaType === 'movie' ? `${animeTitle} (${type})` : `${animeTitle} - Episode ${mappedEp} (${type})`,
                                    url: res.m3u8,
                                    quality: quality,
                                    headers: res.headers,
                                    provider: "animepahe",
                                    type: "m3u8"
                                });
                            }
                            if (res.mp4 && !seen.has(res.mp4)) {
                                seen.add(res.mp4);
                                streams.push({
                                    name: `AnimePahe [${type}] (${quality} MP4)`,
                                    title: mediaType === 'movie' ? `${animeTitle} (${type})` : `${animeTitle} - Episode ${mappedEp} (${type})`,
                                    url: res.mp4,
                                    quality: quality,
                                    headers: {
                                        ...res.headers,
                                        "Referer": kwikUrl
                                    },
                                    provider: "animepahe",
                                    type: "mp4"
                                });
                            }
                        }
                    }).catch(() => {})
                );
            }
        });

        // 2. Pick download links (Pahe.win direct MP4 downloads)
        $('div#pickDownload a').each((i, el) => {
            const $link = $(el);
            const paheUrl = $link.attr('href');
            const linkText = $link.text();
            const quality = extractQuality(linkText);
            const type = $link.find('span').text().toLowerCase().includes('eng') ? 'DUB' : 'SUB';

            if (paheUrl && (paheUrl.includes('pahe.win') || paheUrl.includes('pahe.me') || paheUrl.includes('pahe.li') || paheUrl.includes('kwik'))) {
                promises.push(
                    extractPahe(paheUrl).then(res => {
                        if (res && res.url && !seen.has(res.url)) {
                            seen.add(res.url);
                            streams.push({
                                name: `AnimePahe [${type}] (${quality} Direct)`,
                                title: mediaType === 'movie' ? `${animeTitle} (${type})` : `${animeTitle} - Episode ${mappedEp} (${type})`,
                                url: res.url,
                                quality: quality,
                                headers: res.headers,
                                provider: "animepahe",
                                type: "mp4"
                            });
                        }
                    }).catch(() => {})
                );
            }
        });

        await Promise.all(promises);

        const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
        return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
    } catch (_) {
        return [];
    }
}

module.exports = { getStreams };
