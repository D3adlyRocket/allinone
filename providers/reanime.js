/**
 * reanime - Built from src/reanime/
 * Generated: 2026-09-01T12:42:26.629Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/reanime/reanime.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/reanime/constants.js
var REANIME_DOMAINS = [
  "https://reanime.to",
  "https://reanime.cz",
  "https://reanime.wtf"
];
var REANIME_BASE = "https://reanime.to";
var FLIXCLOUD_BASE = "https://flixcloud.cc";
var ENC_DEC_BASE = "https://enc-dec.app";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var ANILIST_URL = "https://graphql.anilist.co";
var ARM_BASE = "https://arm.haglund.dev/api/v2";
var CINEMETA_URL = "https://v3-cinemeta.strem.io/meta";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9"
};
var FLIX_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "*/*",
  "Origin": FLIXCLOUD_BASE,
  "Referer": `${FLIXCLOUD_BASE}/`
};

// src/reanime/reanime.js
var activeBaseUrl = REANIME_BASE;
function absolutize(path, base = activeBaseUrl) {
  if (!path)
    return "";
  if (path.startsWith("http"))
    return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const isAbsolute = url.startsWith("http");
    const urlsToTry = isAbsolute ? [url] : REANIME_DOMAINS.map((domain) => absolutize(url, domain));
    let lastError = null;
    for (const tryUrl of urlsToTry) {
      try {
        const response = yield fetch(tryUrl, __spreadProps(__spreadValues({}, options), {
          headers: __spreadValues(__spreadValues({}, HEADERS), options.headers || {}),
          cfKiller: true,
          skipSizeCheck: true
        }));
        if (response.ok) {
          if (!isAbsolute) {
            const match = tryUrl.match(/^(https?:\/\/[^\/]+)/);
            if (match)
              activeBaseUrl = match[1];
          }
          return yield response.text();
        }
        lastError = new Error(`Reanime HTTP ${response.status}: ${tryUrl}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error(`Failed to fetch: ${url}`);
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const text = yield fetchText(url, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues({
        "Accept": "application/json, text/plain, */*"
      }, options.headers || {})
    }));
    return JSON.parse(text);
  });
}
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    try {
      const data = yield fetchJson(url);
      return {
        title: data.name || data.title || data.original_name || data.original_title || "",
        year: ((data.first_air_date || data.release_date || "").match(/\d{4}/) || [null])[0],
        imdbId: data.external_ids && data.external_ids.imdb_id
      };
    } catch (e) {
      return { title: "", year: null, imdbId: null };
    }
  });
}
function getAnilistInfo(alId) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    const query = "query($id:Int){Media(id:$id){id title{english romaji} startDate{year}}}";
    try {
      const json = yield fetchJson(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: parseInt(alId, 10) } })
      });
      const media = (_a = json.data) == null ? void 0 : _a.Media;
      if (!media)
        return { title: "", year: null };
      return {
        title: ((_b = media.title) == null ? void 0 : _b.english) || ((_c = media.title) == null ? void 0 : _c.romaji) || "",
        year: ((_d = media.startDate) == null ? void 0 : _d.year) || null
      };
    } catch (e) {
      return { title: "", year: null };
    }
  });
}
function getSyncInfo(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    const isImdb = typeof id === "string" && id.indexOf("tt") === 0;
    const getCinemetaInfo = (imdbId2) => __async(this, null, function* () {
      const type = mediaType === "movie" ? "movie" : "series";
      const url = `${CINEMETA_URL}/${type}/${imdbId2}.json`;
      try {
        const data = yield fetchJson(url);
        const meta = data.meta;
        if (!meta)
          throw new Error("No Cinemeta metadata");
        if (mediaType === "movie")
          return { date: meta.released ? meta.released.split("T")[0] : null, title: meta.name, dayIndex: 1 };
        const videos = meta.videos || [];
        const target = videos.find((v) => v.season == season && v.episode == episode);
        if (!target || !target.released)
          return { date: null, title: null, dayIndex: 1 };
        const targetDate = target.released.split("T")[0];
        const dayIndex = videos.filter((v) => v.season == season && v.released && v.released.split("T")[0] === targetDate && parseInt(v.episode) < parseInt(episode)).length + 1;
        return { date: targetDate, title: target.name || null, dayIndex };
      } catch (e) {
        return { date: null, title: null, dayIndex: 1 };
      }
    });
    if (isImdb) {
      const info = yield getCinemetaInfo(id);
      if (info.date)
        return { imdbId: id, releaseDate: info.date, episodeTitle: info.title, dayIndex: info.dayIndex, episode };
      throw new Error("Could not find release date on Cinemeta");
    }
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "movie" ? "movie" : "tv"}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const details = yield fetchJson(tmdbUrl);
    let imdbId = details.external_ids && details.external_ids.imdb_id || details.imdb_id || null;
    const title = details.name || details.title || null;
    if (!imdbId) {
      try {
        const armData = yield fetchJson(`${ARM_BASE}/themoviedb?id=${id}`);
        imdbId = Array.isArray(armData) && armData.length > 0 ? armData[0].imdb : null;
      } catch (e) {
      }
    }
    if (!imdbId)
      throw new Error(`No IMDb ID found for TMDB ${id}`);
    const cMeta = yield getCinemetaInfo(imdbId);
    let finalDate = cMeta.date;
    if (mediaType === "movie" && details.release_date)
      finalDate = details.release_date;
    if (!finalDate)
      throw new Error(`Could not find release date for ID ${imdbId}`);
    return {
      imdbId,
      tmdbId: id,
      releaseDate: finalDate,
      title,
      episodeTitle: cMeta.title,
      dayIndex: cMeta.dayIndex,
      episode
    };
  });
}
function resolveByDate(releaseDateStr, showTitle, originalEpisode, episodeTitle, dayIndex) {
  return __async(this, null, function* () {
    var _a, _b;
    if (!releaseDateStr || !/^\d{4}-\d{2}-\d{2}/.test(releaseDateStr))
      return null;
    const query = "query($search:String){Page(perPage:20){media(search:$search,type:ANIME){id type format title{romaji english}startDate{year month day}endDate{year month day}episodes streamingEpisodes{title}}}}";
    try {
      const json = yield fetchJson(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { search: showTitle } })
      });
      const candidates = ((_b = (_a = json.data) == null ? void 0 : _a.Page) == null ? void 0 : _b.media) || [];
      if (candidates.length === 0)
        return null;
      const targetDate = new Date(releaseDateStr);
      for (const anime of candidates) {
        const s = anime.startDate;
        const startStr = s.year && s.month && s.day ? `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}` : null;
        if (!startStr)
          continue;
        const startDate = new Date(startStr);
        const diffDays = Math.ceil(Math.abs(targetDate.getTime() - startDate.getTime()) / (1e3 * 60 * 60 * 24));
        let isMatch = false;
        if (anime.format === "MOVIE" || anime.format === "SPECIAL" || anime.episodes === 1) {
          if (diffDays <= 2)
            isMatch = true;
        } else {
          const startLimit = new Date(startDate);
          startLimit.setDate(startLimit.getDate() - 2);
          if (targetDate >= startLimit) {
            if (anime.endDate && anime.endDate.year) {
              const endDate = new Date(anime.endDate.year, (anime.endDate.month || 12) - 1, anime.endDate.day || 31);
              endDate.setDate(endDate.getDate() + 2);
              if (targetDate <= endDate)
                isMatch = true;
            } else {
              isMatch = true;
            }
          }
        }
        if (isMatch) {
          const isTV = anime.format !== "MOVIE" && anime.format !== "SPECIAL" && anime.episodes !== 1;
          let episodeNum = isTV && originalEpisode ? originalEpisode : dayIndex || 1;
          const episodes = anime.streamingEpisodes || [];
          if (episodes.length > 1 && episodeTitle) {
            const cleanTarget = episodeTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
            for (let j = 0; j < episodes.length; j++) {
              const cleanAl = (episodes[j].title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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
  });
}
function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function scoreCandidate(title, query, year, targetAnilistId, candidateAnilistId) {
  if (targetAnilistId && candidateAnilistId && String(targetAnilistId) === String(candidateAnilistId)) {
    return 1e3;
  }
  const a = normalizeTitle(title);
  const b = normalizeTitle(query);
  if (!a || !b)
    return 0;
  let score = 0;
  if (a === b)
    score += 100;
  if (a.includes(b) || b.includes(a))
    score += 50;
  const words = b.split(/\s+/).filter(Boolean);
  for (const word of words)
    if (a.includes(word))
      score += 4;
  if (year && String(title).includes(String(year)))
    score += 10;
  return score;
}
function extractAnilistId(item) {
  var _a, _b, _c;
  const direct = item && (item.anilist_id || item.anilistId);
  if (direct)
    return String(direct);
  const imageUrls = [
    (_a = item == null ? void 0 : item.cover_image) == null ? void 0 : _a.extra_large,
    (_b = item == null ? void 0 : item.cover_image) == null ? void 0 : _b.large,
    (_c = item == null ? void 0 : item.cover_image) == null ? void 0 : _c.medium,
    item == null ? void 0 : item.banner_image
  ].filter(Boolean);
  for (const url of imageUrls) {
    const match = String(url).match(/\/b?x?(\d+)-|\/(\d+)[-.]/);
    if (match)
      return match[1] || match[2];
  }
  return null;
}
function searchReanimeAnime(query, year, targetAnilistId = null) {
  return __async(this, null, function* () {
    const endpoints = [
      `/api/v1/search?q=${encodeURIComponent(query)}&limit=36`,
      `/api/search?q=${encodeURIComponent(query)}`
    ];
    const candidates = [];
    for (const endpoint of endpoints) {
      try {
        const text = yield fetchText(endpoint);
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          const json = JSON.parse(text);
          const list = json.results || json.data || json.anime || (Array.isArray(json) ? json : null);
          if (Array.isArray(list)) {
            list.forEach((item) => {
              var _a, _b, _c;
              const rawSlug = item.anime_id || item.slug || item.id || item.url;
              if (rawSlug) {
                const cleanSlug = String(rawSlug).replace(/-[a-z0-9]{6}$/, "");
                const rawTitle = typeof item.title === "object" ? ((_a = item.title) == null ? void 0 : _a.english) || ((_b = item.title) == null ? void 0 : _b.romaji) || ((_c = item.title) == null ? void 0 : _c.native) || cleanSlug : item.title || item.name || cleanSlug;
                const alId = extractAnilistId(item);
                candidates.push({
                  slug: String(rawSlug),
                  cleanSlug,
                  title: rawTitle,
                  anilistId: alId,
                  score: scoreCandidate(rawTitle, query, year, targetAnilistId, alId)
                });
              }
            });
          }
        }
      } catch (_) {
      }
      if (candidates.some((c) => c.score >= 1e3))
        break;
      if (candidates.length > 0 && !targetAnilistId)
        break;
    }
    const unique = [];
    const seen = /* @__PURE__ */ new Set();
    for (const candidate of candidates) {
      if (!candidate.slug || seen.has(candidate.slug))
        continue;
      seen.add(candidate.slug);
      unique.push(candidate);
    }
    unique.sort((a, b) => b.score - a.score);
    return unique.length > 0 ? unique[0] : null;
  });
}
function getFlixEmbeds(slug, episodeNumber, language, anilistId) {
  return __async(this, null, function* () {
    const watchPath = `/watch/${slug || "anime"}?ep=${episodeNumber}`;
    if (anilistId) {
      try {
        const flixUrl = `/api/flix/${anilistId}/${episodeNumber}`;
        const json = yield fetchJson(flixUrl, {
          headers: { "Referer": absolutize(watchPath) }
        });
        if (json.success && Array.isArray(json.servers) && json.servers.length > 0) {
          const filtered = json.servers.filter((s) => !language || !s.dataType || s.dataType === language);
          return {
            watchUrl: absolutize(watchPath),
            servers: filtered.length > 0 ? filtered : json.servers,
            embeds: (filtered.length > 0 ? filtered : json.servers).map((s) => s.dataLink).filter(Boolean)
          };
        }
      } catch (_) {
      }
    }
    if (slug) {
      try {
        const html = yield fetchText(`/anime/${slug}?_ep=${episodeNumber}`);
        const anilistMatch = html.match(/anilist_id:\s*(\d+)/);
        if (anilistMatch) {
          const alId = anilistMatch[1];
          const flixUrl = `/api/flix/${alId}/${episodeNumber}`;
          const json = yield fetchJson(flixUrl, {
            headers: { "Referer": absolutize(watchPath) }
          });
          if (json.success && Array.isArray(json.servers) && json.servers.length > 0) {
            const filtered = json.servers.filter((s) => !language || !s.dataType || s.dataType === language);
            return {
              watchUrl: absolutize(watchPath),
              servers: filtered.length > 0 ? filtered : json.servers,
              embeds: (filtered.length > 0 ? filtered : json.servers).map((s) => s.dataLink).filter(Boolean)
            };
          }
        }
      } catch (_) {
      }
    }
    return { watchUrl: absolutize(watchPath), servers: [], embeds: [] };
  });
}

// src/reanime/flixcloud.js
function getUrlOrigin(url) {
  if (!url)
    return FLIXCLOUD_BASE;
  const match = url.match(/^(https?:\/\/[^\/]+)/);
  return match ? match[1] : FLIXCLOUD_BASE;
}
function safeAtob(str) {
  if (typeof atob === "function")
    return atob(str);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  str = String(str).replace(/=+$/, "");
  for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
function parseBytes(val) {
  if (!val)
    return new Uint8Array(0);
  if (/^[0-9a-f]+$/i.test(val) && val.length % 2 === 0) {
    const out = new Uint8Array(val.length / 2);
    for (let i = 0; i < val.length; i += 2) {
      out[i / 2] = parseInt(val.substring(i, i + 2), 16);
    }
    return out;
  }
  try {
    const bin = safeAtob(val);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
      out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    return new Uint8Array(0);
  }
}
function normalizeFlixEmbedUrl(url) {
  let finalUrl = url.startsWith("http") ? url : `${FLIXCLOUD_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  finalUrl = finalUrl.replace(/[?&]v=[^&]+/, "").replace(/[?&]kuudere_ts=[^&]+/, "");
  const separator = finalUrl.includes("?") ? "&" : "?";
  return `${finalUrl}${separator}v=1&autoPlay=true&skI=false&skO=false&kuudere_ts=${Date.now()}`;
}
function json5ToJson(json5) {
  return json5.replace(/([{,]\s*)([\w_]+)(\s*:)/g, '$1"$2"$3').replace(/,\s*([}\]])/g, "$1").replace(/:\s*undefined\b/g, ": null");
}
function extractBalancedObject(source, startIdx) {
  const start = source.indexOf("{", startIdx);
  if (start < 0)
    return null;
  let depth = 0, quote = null, escape = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escape)
        escape = false;
      else if (ch === "\\")
        escape = true;
      else if (ch === quote)
        quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0)
        return source.substring(start, i + 1);
    }
  }
  return null;
}
function parseSsrData(html) {
  const dataMatch = html.match(new RegExp('type:\\s*"data",\\s*data:\\s*(\\{.*?\\})\\s*,\\s*uses:', "s"));
  if (dataMatch) {
    try {
      const rawJson = json5ToJson(dataMatch[1]);
      return JSON.parse(rawJson);
    } catch (e) {
    }
  }
  const marker = "obfuscation_seed";
  const markerIdx = html.indexOf(marker);
  if (markerIdx >= 0) {
    let dataIdx = html.lastIndexOf("{", markerIdx);
    while (dataIdx >= 0) {
      const obj = extractBalancedObject(html, dataIdx);
      if (obj && obj.includes(marker)) {
        try {
          const jsonText = json5ToJson(obj);
          const parsed = JSON.parse(jsonText);
          return parsed.data || parsed;
        } catch (e) {
        }
      }
      dataIdx = html.lastIndexOf("{", dataIdx - 1);
    }
  }
  throw new Error("Failed to extract FlixCloud SSR data");
}
function extractFlixCloudDownload(embedUrl) {
  return __async(this, null, function* () {
    try {
      const match = embedUrl.match(/\/e\/([a-z0-9]+)/i);
      const aid = match ? match[1] : null;
      if (!aid)
        return null;
      const dlHeaders = {
        "Accept": "*/*",
        "Referer": `${FLIXCLOUD_BASE}/`,
        "User-Agent": USER_AGENT
      };
      const res = yield fetch(`${FLIXCLOUD_BASE}/d/${aid}/__data.json`, {
        headers: dlHeaders,
        cfKiller: true,
        skipSizeCheck: true
      });
      if (!res.ok)
        return null;
      const dataBody = yield res.text();
      const fileIdMatch = dataBody.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const tokenMatch = dataBody.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
      const baseMatch = dataBody.match(/https:\/\/fetch\d*\.flixcloud\.cc/);
      const resolutionMatch = dataBody.match(/(\d{3,4}p)/);
      const fileId = fileIdMatch ? fileIdMatch[0] : null;
      const token = tokenMatch ? tokenMatch[0] : null;
      const base = baseMatch ? baseMatch[0] : FLIXCLOUD_BASE;
      const resolution = resolutionMatch ? resolutionMatch[1] : null;
      if (!fileId || !token)
        return null;
      let ready = false;
      for (let attempts = 0; !ready && attempts < 2; attempts++) {
        try {
          const progRes = yield fetch(`${base}/download/${fileId}/progress?token=${token}`, {
            headers: dlHeaders,
            cfKiller: true,
            skipSizeCheck: true
          });
          if (progRes.ok) {
            const text = yield progRes.text();
            if (text.includes('"status":"ready"') || text.includes('"ready"')) {
              ready = true;
              break;
            }
            if (text.includes('"status":"failed"'))
              break;
          }
        } catch (_) {
        }
      }
      const fileUrl = `${base}/download/${fileId}?token=${token}`;
      return {
        url: fileUrl,
        quality: resolution || "1080p",
        type: "mkv",
        headers: dlHeaders
      };
    } catch (_) {
      return null;
    }
  });
}
function extractFlixCloud(embedUrl, referer) {
  return __async(this, null, function* () {
    const pageUrl = normalizeFlixEmbedUrl(embedUrl);
    const origin = getUrlOrigin(pageUrl);
    const response = yield fetch(pageUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Origin": origin,
        "Referer": `${FLIXCLOUD_BASE}/`
      },
      cfKiller: true,
      skipSizeCheck: true
    });
    if (!response.ok)
      throw new Error(`FlixCloud embed HTTP ${response.status}`);
    const html = yield response.text();
    const data = parseSsrData(html);
    const rawSubtitles = Array.isArray(data.subtitles) ? data.subtitles : [];
    const subtitles = rawSubtitles.map((sub) => ({
      url: sub.url,
      language: sub.language || sub.lang || "Unknown",
      format: sub.format || (sub.url.endsWith(".ass") ? "ass" : sub.url.endsWith(".vtt") ? "vtt" : "srt"),
      default: !!sub.default
    }));
    try {
      const remoteStream = yield decryptFlixCloudRemote(data, origin);
      return {
        url: remoteStream.streamUrl,
        videoId: data.video_id,
        title: data.video_title,
        subtitles,
        headers: {
          "Referer": `${FLIXCLOUD_BASE}/`,
          "User-Agent": USER_AGENT
        }
      };
    } catch (remoteError) {
      console.warn(`[FlixCloud] Remote decryption error: ${remoteError.message}. Trying local fallback.`);
    }
    const seed = data.obfuscation_seed;
    const obfuscated = data.obfuscated_crypto_data;
    const wPayload = data.w_payload;
    if (!seed || !obfuscated || !wPayload) {
      throw new Error("FlixCloud crypto payload missing");
    }
    const fields = yield deriveFieldMap(seed);
    const cryptoParts = extractObfuscatedCryptoData(obfuscated, fields);
    const frag2Val = data[fields.keyFrag2Field];
    const tokenRef = data[fields.tokenField];
    if (!frag2Val || !tokenRef) {
      throw new Error("FlixCloud token fields missing");
    }
    const tokenResponse = yield fetch(`${origin}/api/m3u8/${tokenRef}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Origin": origin,
        "Referer": `${FLIXCLOUD_BASE}/`
      },
      cfKiller: true,
      skipSizeCheck: true
    });
    if (!tokenResponse.ok)
      throw new Error(`FlixCloud token HTTP ${tokenResponse.status}`);
    const tokenJson = yield tokenResponse.json();
    const videoKey = (yield sha256Hex(tokenRef + "vid")).substring(0, 10);
    const keyKey = (yield sha256Hex(tokenRef + "key")).substring(0, 10);
    const encryptedUrlB64 = tokenJson[videoKey];
    const tokenKeyVal = tokenJson[keyKey];
    if (!encryptedUrlB64 || !tokenKeyVal) {
      throw new Error("FlixCloud token response incomplete");
    }
    const wasmKey = yield _runInterpretedWasmTransform(
      wPayload,
      parseBytes(cryptoParts.frag1B64),
      parseBytes(frag2Val),
      parseBytes(tokenKeyVal),
      parseInt(seed.substring(0, 8), 16)
    );
    const streamUrl = yield decryptAesCbcUrl(wasmKey, cryptoParts.ivB64, encryptedUrlB64, seed);
    const cleanStreamUrl = streamUrl.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
    return {
      url: cleanStreamUrl,
      videoId: data.video_id,
      title: data.video_title,
      subtitles,
      headers: {
        "Referer": `${FLIXCLOUD_BASE}/`,
        "User-Agent": USER_AGENT
      }
    };
  });
}
function decryptFlixCloudRemote(data, origin) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    const cleanData = Object.assign({}, data);
    delete cleanData.subtitles;
    delete cleanData.intro_chapter;
    delete cleanData.outro_chapter;
    const resolveResponse = yield fetch(`${ENC_DEC_BASE}/api/dec-flixcloud?type=token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify({ data: cleanData })
    });
    if (!resolveResponse.ok)
      throw new Error(`Token API HTTP ${resolveResponse.status}`);
    const resolveJson = yield resolveResponse.json();
    const result = resolveJson.result || resolveJson;
    const token = result.token || result.context && result.context.token;
    const context = result.context || result;
    if (!token)
      throw new Error("Missing token in resolve response");
    const tokenResponse = yield fetch(`${origin}/api/m3u8/${token}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Origin": origin,
        "Referer": `${FLIXCLOUD_BASE}/`
      },
      cfKiller: true,
      skipSizeCheck: true
    });
    if (!tokenResponse.ok)
      throw new Error(`Token authorization HTTP ${tokenResponse.status}`);
    const tokenJson = yield tokenResponse.json();
    const decryptResponse = yield fetch(`${ENC_DEC_BASE}/api/dec-flixcloud?type=stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify({
        data: {
          context,
          stream_response: tokenJson
        }
      })
    });
    if (!decryptResponse.ok)
      throw new Error(`Stream decrypt HTTP ${decryptResponse.status}`);
    const decryptJson = yield decryptResponse.json();
    const stream = ((_a = decryptJson.result) == null ? void 0 : _a.stream) || ((_b = decryptJson.result) == null ? void 0 : _b.url) || decryptJson.result;
    if (!stream || typeof stream !== "string") {
      throw new Error("Invalid stream returned from decrypt API");
    }
    const wPayload = ((_d = (_c = decryptJson.result) == null ? void 0 : _c.context) == null ? void 0 : _d.w_payload) || (context == null ? void 0 : context.w_payload) || "";
    const cleanStream = stream.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
    const parseUrl = `${ENC_DEC_BASE}/api/parse-flixcloud?url=${encodeURIComponent(cleanStream)}&w_payload=${encodeURIComponent(wPayload)}`;
    return {
      streamUrl: parseUrl,
      rawStreamUrl: cleanStream
    };
  });
}
function deriveFieldMap(seed) {
  return __async(this, null, function* () {
    let first = seed;
    for (let i = 0; i < 3; i++)
      first = yield sha256Hex(first + String(i));
    let second = first;
    for (let i = 0; i < 3; i++)
      second = yield sha256Hex(second + String(i));
    return {
      keyField: `kf_${first.substring(8, 16)}`,
      ivField: `ivf_${first.substring(16, 24)}`,
      containerName: `cd_${first.substring(24, 32)}`,
      arrayName: `ad_${first.substring(32, 40)}`,
      objectName: `od_${first.substring(40, 48)}`,
      tokenField: `${first.substring(48, 64)}_${first.substring(56, 64)}`,
      keyFrag2Field: `${second.substring(0, 16)}_${second.substring(16, 24)}`
    };
  });
}
function extractObfuscatedCryptoData(data, fields) {
  var _a;
  const container = data[fields.containerName];
  const arr = container == null ? void 0 : container[fields.arrayName];
  const obj = (_a = arr == null ? void 0 : arr[0]) == null ? void 0 : _a[fields.objectName];
  if (!obj)
    throw new Error("Invalid FlixCloud crypto data structure");
  return { frag1B64: obj[fields.keyField], ivB64: obj[fields.ivField] };
}
function _runInterpretedWasmTransform(payloadB64, frag1, frag2, tokenKey, seedInt) {
  return __async(this, null, function* () {
    const wasmBytes = parseBytes(payloadB64);
    const bodies = _wasmFunctionBodies(wasmBytes);
    const len = frag1.length;
    const memory = new Uint8Array(4096 + len * 4);
    const p1 = 1e3, p2 = p1 + len, p3 = p2 + len, out = p3 + len;
    memory.set(frag1, p1);
    memory.set(frag2, p2);
    memory.set(tokenKey, p3);
    const ok = _executeWasmBody(bodies[1], [p1, p2, p3, out, len], [seedInt], memory);
    if (!ok)
      throw new Error("WASM execution failed");
    return memory.subarray(out, out + len);
  });
}
function _wasmFunctionBodies(bytes) {
  const bodies = [];
  let cursor = 8;
  const readUleb = () => {
    let res = 0, shift = 0;
    while (cursor < bytes.length) {
      const b = bytes[cursor++];
      res |= (b & 127) << shift;
      if ((b & 128) === 0)
        break;
      shift += 7;
    }
    return res;
  };
  while (cursor < bytes.length) {
    const id = bytes[cursor++];
    const size = readUleb();
    const end = cursor + size;
    if (id === 10) {
      const count = readUleb();
      for (let i = 0; i < count; i++) {
        const bSize = readUleb();
        bodies.push(bytes.subarray(cursor, cursor + bSize));
        cursor += bSize;
      }
      break;
    }
    cursor = end;
  }
  return bodies;
}
function _executeWasmBody(body, params, globals, memory) {
  let pc = 0;
  const readUleb = () => {
    let res = 0, shift = 0;
    while (pc < body.length) {
      const b = body[pc++];
      res |= (b & 127) << shift;
      if ((b & 128) === 0)
        break;
      shift += 7;
    }
    return res;
  };
  const readSleb = () => {
    let res = 0, shift = 0, b = 0;
    do {
      b = body[pc++];
      res |= (b & 127) << shift;
      shift += 7;
    } while ((b & 128) !== 0);
    if (shift < 32 && (b & 64) !== 0)
      res |= ~0 << shift;
    return res | 0;
  };
  const locals = params.slice();
  const lCount = readUleb();
  for (let i = 0; i < lCount; i++) {
    const c = readUleb();
    pc++;
    for (let j = 0; j < c; j++)
      locals.push(0);
  }
  const blockEnds = _wasmBlockEnds(body, pc);
  const stack = [], cStack = [];
  let steps = 0;
  const branch = (depth) => {
    const idx = cStack.length - 1 - depth;
    if (idx < 0)
      return false;
    const frame = cStack[idx];
    if (frame.isLoop) {
      cStack.length = idx + 1;
      pc = frame.startPc;
    } else {
      cStack.length = idx;
      pc = frame.endPc + 1;
    }
    return true;
  };
  while (pc < body.length && steps++ < 1e6) {
    const opPc = pc, op = body[pc++];
    switch (op) {
      case 2:
      case 3:
        pc++;
        cStack.push({ isLoop: op === 3, startPc: pc, endPc: blockEnds.get(opPc) });
        break;
      case 11:
        if (cStack.length === 0)
          return true;
        cStack.pop();
        break;
      case 12:
        if (!branch(readUleb()))
          return false;
        break;
      case 13: {
        const d = readUleb();
        if (stack.pop() !== 0)
          branch(d);
        break;
      }
      case 32:
        stack.push(locals[readUleb()] | 0);
        break;
      case 33:
        locals[readUleb()] = stack.pop() || 0;
        break;
      case 35:
        stack.push(globals[readUleb()] | 0);
        break;
      case 65:
        stack.push(readSleb());
        break;
      case 45: {
        readUleb();
        const off = readUleb();
        const addr = (stack.pop() || 0) + off;
        stack.push(memory[addr] || 0);
        break;
      }
      case 58: {
        readUleb();
        const off = readUleb();
        const val = stack.pop() || 0;
        const addr = (stack.pop() || 0) + off;
        memory[addr] = val & 255;
        break;
      }
      case 69:
        stack.push((stack.pop() || 0) === 0 ? 1 : 0);
        break;
      case 79: {
        const r = (stack.pop() || 0) >>> 0, l = (stack.pop() || 0) >>> 0;
        stack.push(l >= r ? 1 : 0);
        break;
      }
      case 106: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l + r | 0);
        break;
      }
      case 107: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l - r | 0);
        break;
      }
      case 108: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(Math.imul(l, r));
        break;
      }
      case 113: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l & r);
        break;
      }
      case 114: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l | r);
        break;
      }
      case 115: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l ^ r);
        break;
      }
      case 116: {
        const s = (stack.pop() || 0) & 31, v = stack.pop() || 0;
        stack.push(v << s);
        break;
      }
      case 118: {
        const s = (stack.pop() || 0) & 31, v = stack.pop() || 0;
        stack.push(v >>> s);
        break;
      }
    }
  }
  return true;
}
function _wasmBlockEnds(body, start) {
  const ends = /* @__PURE__ */ new Map(), stack = [];
  let pc = start;
  const readUleb = () => {
    while (pc < body.length && (body[pc++] & 128) !== 0) {
    }
  };
  while (pc < body.length) {
    const opPc = pc, op = body[pc++];
    switch (op) {
      case 2:
      case 3:
        pc++;
        stack.push(opPc);
        break;
      case 11:
        if (stack.length > 0)
          ends.set(stack.pop(), opPc);
        break;
      case 12:
      case 13:
      case 32:
      case 33:
      case 35:
      case 65:
        readUleb();
        break;
      case 45:
      case 58:
        readUleb();
        readUleb();
        break;
    }
  }
  return ends;
}
function uint8ArrayToWordArray(arr) {
  const CryptoJS = require("crypto-js");
  const words = [];
  for (let i = 0; i < arr.length; i++) {
    words[i >>> 2] |= (arr[i] & 255) << 24 - i % 4 * 8;
  }
  return CryptoJS.lib.WordArray.create(words, arr.length);
}
function decryptAesCbcUrl(rawKey, ivVal, cipherB64, seed) {
  return __async(this, null, function* () {
    let CryptoJS = null;
    try {
      CryptoJS = require("crypto-js");
    } catch (e) {
    }
    if (CryptoJS && CryptoJS.AES && typeof CryptoJS.AES.decrypt === "function") {
      try {
        const salt = CryptoJS.enc.Utf8.parse(seed);
        const passphrase = uint8ArrayToWordArray(rawKey);
        const iv = uint8ArrayToWordArray(parseBytes(ivVal));
        const derivedKey = CryptoJS.PBKDF2(passphrase, salt, { keySize: 256 / 32, iterations: 1e3, hasher: CryptoJS.algo.SHA256 });
        const keyBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          keyBytes[i] = derivedKey.words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
        }
        for (let i = 0; i < 32; i++) {
          keyBytes[i] ^= seed.charCodeAt(i % seed.length);
        }
        const finalKey = CryptoJS.SHA256(uint8ArrayToWordArray(keyBytes));
        const decrypted = CryptoJS.AES.decrypt(cipherB64, finalKey, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (result)
          return result.trim();
      } catch (e) {
      }
    }
    throw new Error("Local decryption failed");
  });
}
function sha256Hex(text) {
  return __async(this, null, function* () {
    const CryptoJS = require("crypto-js");
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  });
}

// src/reanime/index.js
function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
  return __async(this, null, function* () {
    try {
      if (mediaType !== "tv" && mediaType !== "movie")
        return [];
      let alId = null;
      let episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
      let searchTitle = "";
      let searchYear = null;
      if (typeof tmdbId === "string" && tmdbId.indexOf("anilist:") === 0) {
        alId = tmdbId.split(":")[1];
      } else {
        try {
          const syncInfo = yield getSyncInfo(tmdbId, mediaType, season, episodeNumber);
          searchTitle = syncInfo.title;
          const syncResult = yield resolveByDate(syncInfo.releaseDate, syncInfo.title, episodeNumber, syncInfo.episodeTitle, syncInfo.dayIndex);
          if (syncResult && syncResult.alId) {
            alId = String(syncResult.alId);
            episodeNumber = syncResult.episode;
            searchTitle = syncResult.title;
          }
        } catch (_) {
        }
        if (!alId && !searchTitle) {
          try {
            const tmdb = yield getTmdbInfo(tmdbId, mediaType);
            searchTitle = tmdb.title;
            searchYear = tmdb.year;
          } catch (_) {
          }
        }
      }
      const serversByLang = {};
      let watchUrl = "";
      if (alId) {
        for (const lang of ["sub", "dub"]) {
          try {
            const res = yield getFlixEmbeds(null, episodeNumber, lang, alId);
            if (res.servers && res.servers.length > 0) {
              serversByLang[lang] = res.servers;
              if (res.watchUrl)
                watchUrl = res.watchUrl;
            }
          } catch (_) {
          }
        }
      }
      if (Object.keys(serversByLang).length === 0) {
        if (!searchTitle && alId) {
          const alInfo = yield getAnilistInfo(alId);
          searchTitle = alInfo.title;
          searchYear = alInfo.year;
        }
        if (searchTitle) {
          const anime = yield searchReanimeAnime(searchTitle, searchYear, alId);
          if (anime) {
            const slug = anime.slug;
            const finalAlId = alId || anime.anilistId;
            for (const lang of ["sub", "dub"]) {
              try {
                const res = yield getFlixEmbeds(slug, episodeNumber, lang, finalAlId);
                if (res.servers && res.servers.length > 0) {
                  serversByLang[lang] = res.servers;
                  if (res.watchUrl)
                    watchUrl = res.watchUrl;
                }
              } catch (_) {
              }
            }
          }
        }
      }
      if (Object.keys(serversByLang).length === 0)
        return [];
      const streams = [];
      const seen = /* @__PURE__ */ new Set();
      for (const language of ["sub", "dub"]) {
        const serverList = serversByLang[language] || [];
        for (let i = 0; i < serverList.length; i++) {
          const server = serverList[i];
          const dataLink = server.dataLink;
          if (!dataLink)
            continue;
          const serverName = server.serverName || `HD-${i + 1}`;
          const langUpper = language.toUpperCase();
          const displayTitle = searchTitle || "Anime";
          const streamTitle = mediaType === "movie" ? `${displayTitle} (${langUpper})` : `${displayTitle} - Episode ${episodeNumber} (${langUpper})`;
          try {
            const directDl = yield extractFlixCloudDownload(dataLink);
            if (directDl && directDl.url && !seen.has(directDl.url)) {
              seen.add(directDl.url);
              streams.push({
                name: `Reanime [${langUpper}] ${serverName} Download (${directDl.quality || "MKV"})`,
                title: streamTitle,
                url: directDl.url,
                quality: directDl.quality || "1080p",
                headers: directDl.headers,
                provider: "reanime",
                type: "mkv"
              });
            }
          } catch (_) {
          }
          try {
            const extracted = yield extractFlixCloud(dataLink, watchUrl);
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
          } catch (_) {
          }
        }
      }
      return streams;
    } catch (error) {
      console.error(`[Reanime] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
