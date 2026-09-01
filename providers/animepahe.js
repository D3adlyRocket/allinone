/**
 * animepahe - Built from src/animepahe/
 * Generated: 2026-09-01T13:06:43.712Z
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

// src/animepahe/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/animepahe/constants.js
var ANIMEPAHE_DOMAINS = [
  "https://animepahe.pw",
  "https://animepahe.org",
  "https://animepahe.com",
  "https://animepahe.ru"
];
var MAIN_URL = "https://animepahe.pw";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Referer": `${MAIN_URL}/`
};

// src/animepahe/utils.js
var activeDomain = MAIN_URL;
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const isAbsolute = url.startsWith("http");
    const urlsToTry = isAbsolute ? [url] : ANIMEPAHE_DOMAINS.map((d) => `${d}${url.startsWith("/") ? "" : "/"}${url}`);
    let lastError = null;
    for (const tryUrl of urlsToTry) {
      try {
        const isPaheUrl = tryUrl.includes("animepahe.");
        const mergedHeaders = __spreadValues(__spreadProps(__spreadValues({}, HEADERS), {
          "Referer": `${activeDomain}/`
        }), options.headers || {});
        let response = yield fetch(tryUrl, __spreadValues({
          headers: mergedHeaders,
          cfKiller: isPaheUrl,
          skipSizeCheck: true
        }, options));
        if ((response.status === 403 || response.status === 503) && typeof Cloudflare !== "undefined" && Cloudflare.solve) {
          try {
            const solvedHeaders = yield Cloudflare.solve(tryUrl);
            if (solvedHeaders["Cookie"])
              mergedHeaders["Cookie"] = solvedHeaders["Cookie"];
            if (solvedHeaders["User-Agent"])
              mergedHeaders["User-Agent"] = solvedHeaders["User-Agent"];
            response = yield fetch(tryUrl, __spreadValues({
              headers: mergedHeaders,
              skipSizeCheck: true
            }, options));
          } catch (_) {
          }
        }
        if (response.ok) {
          if (!isAbsolute) {
            const match = tryUrl.match(/^(https?:\/\/[^\/]+)/);
            if (match)
              activeDomain = match[1];
          }
          return yield response.text();
        }
        lastError = new Error(`HTTP ${response.status} on ${tryUrl}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error(`Failed to fetch: ${url}`);
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const text = yield fetchText(url, options);
    return JSON.parse(text);
  });
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
      const res = yield fetch(url);
      const data = yield res.json();
      return data.imdb_id;
    } catch (_) {
      return null;
    }
  });
}
function resolveMapping(imdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = `https://id-mapping-api-malid.hf.space/api/resolve?id=${imdbId}&s=${season}&e=${episode}`;
      const res = yield fetch(url);
      if (!res.ok)
        return null;
      return yield res.json();
    } catch (_) {
      return null;
    }
  });
}
function getMalTitle(malId) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const res = yield fetch(`https://api.jikan.moe/v4/anime/${malId}`);
      if (!res.ok)
        return null;
      const data = yield res.json();
      return ((_a = data.data) == null ? void 0 : _a.title) || ((_b = data.data) == null ? void 0 : _b.title_english);
    } catch (_) {
      return null;
    }
  });
}
function searchAnime(query, page = 1) {
  return __async(this, null, function* () {
    const timeSuffix = Math.floor(Date.now() / 1e3) + page * 3;
    const url = `/api?m=search&l=8&q=${encodeURIComponent(query + " " + timeSuffix)}&page=${page}`;
    return yield fetchJson(url);
  });
}
function extractQuality(text) {
  const match = text.match(/(\d{3,4}p)/);
  return match ? match[1] : "720p";
}

// src/animepahe/extractors.js
function unpack(code) {
  try {
    const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
    if (match) {
      let [_, quote1, p, a, c, quote2, kStr] = match;
      p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      a = parseInt(a, 10);
      c = parseInt(c, 10);
      const k = kStr.split("|");
      const e = (c2) => (c2 < a ? "" : e(parseInt(c2 / a, 10))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
      const d = {};
      while (c--)
        d[e(c)] = k[c] || e(c);
      return p.replace(/\b\w+\b/g, (w) => d[w] !== void 0 ? d[w] : w);
    }
  } catch (_) {
  }
  return code;
}
function extractKwik(url) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": `${MAIN_URL}/`,
          "User-Agent": USER_AGENT
        }),
        cfKiller: true,
        skipSizeCheck: true
      });
      const finalUrl = res.url || url;
      const html = yield res.text();
      const scripts = html.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
      const matches = [];
      for (const script of scripts) {
        if (script.includes("eval(function(p,a,c,k,e,d)")) {
          let pos = 0;
          while (true) {
            const start = script.indexOf("eval(function(p,a,c,k,e,d)", pos);
            if (start === -1)
              break;
            const end = script.indexOf(".split('|')", start);
            if (end === -1)
              break;
            const closeParen = script.indexOf("))", end);
            if (closeParen === -1)
              break;
            matches.push(script.substring(start, closeParen + 2));
            pos = closeParen + 2;
          }
        }
      }
      for (const scriptContent of matches) {
        const unpacked = unpack(scriptContent);
        const m3u8Match = unpacked.match(/source\s*=\s*['"]([^'"]+m3u8[^'"]*)['"]/) || unpacked.match(/const\s+source\s*=\s*\\['"]([^\\'"]+m3u8[^\\'"]*)\\['"]/);
        if (m3u8Match) {
          const m3u8Url = m3u8Match[1];
          const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
          const title = titleMatch ? titleMatch[1].trim() : "video";
          const fileName = title.endsWith(".mp4") ? title : `${title}.mp4`;
          const urlParts = m3u8Url.replace("/stream/", "/mp4/").split("/");
          urlParts.pop();
          const mp4Base = urlParts.join("/");
          const mp4Url = `${mp4Base}?file=${encodeURIComponent(fileName)}`;
          return {
            m3u8: m3u8Url,
            mp4: mp4Url,
            headers: {
              "Referer": finalUrl,
              "Origin": "https://kwik.cx",
              "User-Agent": USER_AGENT
            }
          };
        }
      }
    } catch (_) {
    }
    return null;
  });
}
function paheDecrypt(fullString, key, v1, v2) {
  const keyIndexMap = {};
  for (let i2 = 0; i2 < key.length; i2++)
    keyIndexMap[key[i2]] = i2;
  let result = "";
  let i = 0;
  const toFind = key[v2];
  while (i < fullString.length) {
    const nextIndex = fullString.indexOf(toFind, i);
    if (nextIndex === -1)
      break;
    let decodedCharStr = "";
    for (let j = i; j < nextIndex; j++) {
      decodedCharStr += keyIndexMap[fullString[j]];
    }
    i = nextIndex + 1;
    const decodedChar = String.fromCharCode(parseInt(decodedCharStr, v2) - v1);
    result += decodedChar;
  }
  return result;
}
function extractPahe(url) {
  return __async(this, null, function* () {
    try {
      const initUrl = url.endsWith("/i") ? url : `${url}/i`;
      const initRes = yield fetch(initUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": "https://pahe.win/"
        },
        cfKiller: true,
        skipSizeCheck: true
      });
      const redirectLoc = initRes.headers.get("location") || initRes.headers.get("Location");
      if (!redirectLoc)
        return null;
      const kwikUrl = redirectLoc.startsWith("http") ? redirectLoc : `https://${redirectLoc.replace(/^\/+/, "")}`;
      const kwikRes = yield fetch(kwikUrl, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": "https://kwik.cx/"
        },
        cfKiller: true,
        skipSizeCheck: true
      });
      const html = yield kwikRes.text();
      const setCookieHeader = kwikRes.headers.get("set-cookie") || kwikRes.headers.get("Set-Cookie");
      let cookie = "";
      if (setCookieHeader) {
        cookie = setCookieHeader.split(";")[0];
      }
      const kwikParamsRegex = /\("(\w+)",\d+,"(\w+)",(\d+),(\d+),\d+\)/;
      const match = html.match(kwikParamsRegex);
      if (!match)
        return null;
      const [_, fullString, key, v1, v2] = match;
      const decrypted = paheDecrypt(fullString, key, parseInt(v1, 10), parseInt(v2, 10));
      const actionMatch = decrypted.match(/action="([^"]+)"/);
      const tokenMatch = decrypted.match(/value="([^"]+)"/);
      if (!actionMatch || !tokenMatch)
        return null;
      const postUri = actionMatch[1];
      const token = tokenMatch[1];
      const formData = new URLSearchParams();
      formData.append("_token", token);
      let tries = 0;
      let location = null;
      while (tries < 10) {
        const postRes = yield fetch(postUri, {
          method: "POST",
          redirect: "manual",
          headers: {
            "User-Agent": USER_AGENT,
            "Referer": kwikUrl,
            "Cookie": cookie,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: formData.toString(),
          cfKiller: true,
          skipSizeCheck: true
        });
        if (postRes.status === 302 || postRes.status === 301) {
          location = postRes.headers.get("location") || postRes.headers.get("Location");
          break;
        }
        tries++;
      }
      if (location) {
        return {
          url: location,
          headers: {
            "Referer": "https://kwik.cx/",
            "User-Agent": USER_AGENT
          }
        };
      }
    } catch (_) {
    }
    return null;
  });
}

// src/animepahe/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      let animeSession = null;
      let animeTitle = "";
      let mappedEp = episode;
      let targetMalId = null;
      if (mediaType === "tv") {
        const imdbId = yield getImdbId(tmdbId, mediaType);
        if (!imdbId)
          return [];
        const mapping = yield resolveMapping(imdbId, season, episode);
        if (!mapping || !mapping.mal_id)
          return [];
        targetMalId = mapping.mal_id;
        mappedEp = mapping.mal_episode || episode;
        animeTitle = yield getMalTitle(targetMalId);
        if (!animeTitle)
          return [];
        const searchResults = yield searchAnime(animeTitle);
        if (searchResults.data && searchResults.data.length > 0) {
          for (let i = 0; i < Math.min(searchResults.data.length, 5); i++) {
            const item = searchResults.data[i];
            try {
              const pageHtml = yield fetchText(`/anime/${item.session}`);
              if (pageHtml.includes(`myanimelist.net/anime/${targetMalId}`) || item.id && String(item.id) === String(targetMalId)) {
                animeSession = item.session;
                break;
              }
            } catch (_) {
            }
          }
          if (!animeSession && searchResults.data.length > 0) {
            animeSession = searchResults.data[0].session;
          }
        }
      } else {
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=439c478a771f35c05022f9feabcca01c`;
        const tmdbRes = yield fetch(tmdbUrl);
        const tmdbData = yield tmdbRes.json();
        animeTitle = tmdbData.title || tmdbData.original_title;
        mappedEp = 1;
        if (!animeTitle)
          return [];
        const searchResults = yield searchAnime(animeTitle);
        if (searchResults.data && searchResults.data.length > 0) {
          const match = searchResults.data.find((r) => r.title.toLowerCase() === animeTitle.toLowerCase()) || searchResults.data[0];
          animeSession = match.session;
        }
      }
      if (!animeSession)
        return [];
      const firstPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=1`;
      const firstPageData = yield fetchJson(firstPageUrl);
      if (!firstPageData.data || firstPageData.data.length === 0)
        return [];
      const paheEpStart = Math.floor(firstPageData.data[0].episode);
      const perPage = firstPageData.per_page || 30;
      const targetPaheEp = paheEpStart - 1 + Number(mappedEp);
      const targetPage = Math.ceil(Number(mappedEp) / perPage) || 1;
      const targetPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${targetPage}`;
      const targetPageData = yield fetchJson(targetPageUrl);
      let episodeSession = null;
      if (targetPageData && targetPageData.data) {
        const foundEp = targetPageData.data.find((e) => Math.floor(e.episode) === targetPaheEp);
        if (foundEp)
          episodeSession = foundEp.session;
      }
      if (!episodeSession && targetPage !== 1) {
        const fallbackEp = firstPageData.data.find((e) => Math.floor(e.episode) === targetPaheEp);
        if (fallbackEp)
          episodeSession = fallbackEp.session;
      }
      if (!episodeSession)
        return [];
      const playUrl = `/play/${animeSession}/${episodeSession}`;
      const playHtml = yield fetchText(playUrl);
      const $ = import_cheerio_without_node_native.default.load(playHtml);
      const streams = [];
      const promises = [];
      const seen = /* @__PURE__ */ new Set();
      $("#resolutionMenu button").each((i, el) => {
        const $btn = $(el);
        const kwikUrl = $btn.attr("data-src");
        const btnText = $btn.text();
        const quality = extractQuality(btnText);
        const type = btnText.toLowerCase().includes("eng") ? "DUB" : "SUB";
        if (kwikUrl && kwikUrl.includes("kwik")) {
          promises.push(
            extractKwik(kwikUrl).then((res) => {
              if (res) {
                if (res.m3u8 && !seen.has(res.m3u8)) {
                  seen.add(res.m3u8);
                  streams.push({
                    name: `AnimePahe [${type}] (${quality} HLS)`,
                    title: mediaType === "movie" ? `${animeTitle} (${type})` : `${animeTitle} - Episode ${mappedEp} (${type})`,
                    url: res.m3u8,
                    quality,
                    headers: res.headers,
                    provider: "animepahe",
                    type: "m3u8"
                  });
                }
                if (res.mp4 && !seen.has(res.mp4)) {
                  seen.add(res.mp4);
                  streams.push({
                    name: `AnimePahe [${type}] (${quality} MP4)`,
                    title: mediaType === "movie" ? `${animeTitle} (${type})` : `${animeTitle} - Episode ${mappedEp} (${type})`,
                    url: res.mp4,
                    quality,
                    headers: __spreadProps(__spreadValues({}, res.headers), {
                      "Referer": kwikUrl
                    }),
                    provider: "animepahe",
                    type: "mp4"
                  });
                }
              }
            }).catch(() => {
            })
          );
        }
      });
      $("div#pickDownload a").each((i, el) => {
        const $link = $(el);
        const paheUrl = $link.attr("href");
        const linkText = $link.text();
        const quality = extractQuality(linkText);
        const type = $link.find("span").text().toLowerCase().includes("eng") ? "DUB" : "SUB";
        if (paheUrl && (paheUrl.includes("pahe.win") || paheUrl.includes("pahe.me") || paheUrl.includes("pahe.li") || paheUrl.includes("kwik"))) {
          promises.push(
            extractPahe(paheUrl).then((res) => {
              if (res && res.url && !seen.has(res.url)) {
                seen.add(res.url);
                streams.push({
                  name: `AnimePahe [${type}] (${quality} Direct)`,
                  title: mediaType === "movie" ? `${animeTitle} (${type})` : `${animeTitle} - Episode ${mappedEp} (${type})`,
                  url: res.url,
                  quality,
                  headers: res.headers,
                  provider: "animepahe",
                  type: "mp4"
                });
              }
            }).catch(() => {
            })
          );
        }
      });
      yield Promise.all(promises);
      const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
      return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
    } catch (_) {
      return [];
    }
  });
}
module.exports = { getStreams };
