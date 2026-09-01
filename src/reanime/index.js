import { getFlixEmbeds, getTmdbInfo, getAnilistInfo, searchReanimeAnime, getSyncInfo, resolveByDate } from './reanime.js';
import { extractFlixCloud, extractFlixCloudDownload } from './flixcloud.js';

async function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
    try {
        if (mediaType !== 'tv' && mediaType !== 'movie') return [];

        let alId = null;
        let episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
        let searchTitle = "";
        let searchYear = null;

        if (typeof tmdbId === 'string' && tmdbId.indexOf('anilist:') === 0) {
            alId = tmdbId.split(':')[1];
        } else {
            try {
                const syncInfo = await getSyncInfo(tmdbId, mediaType, season, episodeNumber);
                searchTitle = syncInfo.title;

                const syncResult = await resolveByDate(syncInfo.releaseDate, syncInfo.title, episodeNumber, syncInfo.episodeTitle, syncInfo.dayIndex);
                if (syncResult && syncResult.alId) {
                    alId = String(syncResult.alId);
                    episodeNumber = syncResult.episode;
                    searchTitle = syncResult.title;
                }
            } catch (_) {}

            if (!alId && !searchTitle) {
                try {
                    const tmdb = await getTmdbInfo(tmdbId, mediaType);
                    searchTitle = tmdb.title;
                    searchYear = tmdb.year;
                } catch (_) {}
            }
        }

        const serversByLang = {};
        let watchUrl = "";

        if (alId) {
            for (const lang of ["sub", "dub"]) {
                try {
                    const res = await getFlixEmbeds(null, episodeNumber, lang, alId);
                    if (res.servers && res.servers.length > 0) {
                        serversByLang[lang] = res.servers;
                        if (res.watchUrl) watchUrl = res.watchUrl;
                    }
                } catch (_) {}
            }
        }

        if (Object.keys(serversByLang).length === 0) {
            if (!searchTitle && alId) {
                const alInfo = await getAnilistInfo(alId);
                searchTitle = alInfo.title;
                searchYear = alInfo.year;
            }

            if (searchTitle) {
                const anime = await searchReanimeAnime(searchTitle, searchYear, alId);
                if (anime) {
                    const slug = anime.slug;
                    const finalAlId = alId || anime.anilistId;
                    for (const lang of ["sub", "dub"]) {
                        try {
                            const res = await getFlixEmbeds(slug, episodeNumber, lang, finalAlId);
                            if (res.servers && res.servers.length > 0) {
                                serversByLang[lang] = res.servers;
                                if (res.watchUrl) watchUrl = res.watchUrl;
                            }
                        } catch (_) {}
                    }
                }
            }
        }

        if (Object.keys(serversByLang).length === 0) return [];

        const streams = [];
        const seen = new Set();

        for (const language of ["sub", "dub"]) {
            const serverList = serversByLang[language] || [];

            for (let i = 0; i < serverList.length; i++) {
                const server = serverList[i];
                const dataLink = server.dataLink;
                if (!dataLink) continue;

                const serverName = server.serverName || `HD-${i + 1}`;
                const langUpper = language.toUpperCase();
                const displayTitle = searchTitle || "Anime";
                const streamTitle = mediaType === 'movie'
                    ? `${displayTitle} (${langUpper})`
                    : `${displayTitle} - Episode ${episodeNumber} (${langUpper})`;

                // 1. Direct Download Stream (MKV)
                try {
                    const directDl = await extractFlixCloudDownload(dataLink);
                    if (directDl && directDl.url && !seen.has(directDl.url)) {
                        seen.add(directDl.url);
                        streams.push({
                            name: `Reanime [${langUpper}] ${serverName} Download (${directDl.quality || 'MKV'})`,
                            title: streamTitle,
                            url: directDl.url,
                            quality: directDl.quality || "1080p",
                            headers: directDl.headers,
                            provider: "reanime",
                            type: "mkv"
                        });
                    }
                } catch (_) {}

                // 2. HLS Stream (m3u8)
                try {
                    const extracted = await extractFlixCloud(dataLink, watchUrl);
                    if (extracted && extracted.url && !seen.has(extracted.url)) {
                        seen.add(extracted.url);
                        streams.push({
                            name: `Reanime [${langUpper}] ${serverName} (HLS Auto)`,
                            title: streamTitle,
                            url: extracted.url,
                            quality: "Auto",
                            headers: extracted.headers,
                            provider: "reanime",
                            type: "m3u8",
                            subtitles: extracted.subtitles || []
                        });
                    }
                } catch (_) {}
            }
        }

        return streams;
    } catch (error) {
        console.error(`[Reanime] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
