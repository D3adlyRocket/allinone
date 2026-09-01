import { MAIN_URL, USER_AGENT, HEADERS } from './constants.js';

export function unpack(code) {
    try {
        const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
        if (match) {
            let [_, quote1, p, a, c, quote2, kStr] = match;
            p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            a = parseInt(a, 10);
            c = parseInt(c, 10);
            const k = kStr.split('|');
            const e = (c) => (c < a ? '' : e(parseInt(c / a, 10))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));

            const d = {};
            while (c--) d[e(c)] = k[c] || e(c);

            return p.replace(/\b\w+\b/g, (w) => d[w] !== undefined ? d[w] : w);
        }
    } catch (_) {}
    return code;
}

export async function extractKwik(url) {
    try {
        const res = await fetch(url, {
            headers: {
                ...HEADERS,
                "Referer": `${MAIN_URL}/`,
                "User-Agent": USER_AGENT
            },
            cfKiller: true,
            skipSizeCheck: true
        });
        const finalUrl = res.url || url;
        const html = await res.text();

        const scripts = html.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
        const matches = [];

        for (const script of scripts) {
            if (script.includes('eval(function(p,a,c,k,e,d)')) {
                let pos = 0;
                while (true) {
                    const start = script.indexOf('eval(function(p,a,c,k,e,d)', pos);
                    if (start === -1) break;

                    const end = script.indexOf('.split(\'|\')', start);
                    if (end === -1) break;

                    const closeParen = script.indexOf('))', end);
                    if (closeParen === -1) break;

                    matches.push(script.substring(start, closeParen + 2));
                    pos = closeParen + 2;
                }
            }
        }

        for (const scriptContent of matches) {
            const unpacked = unpack(scriptContent);
            const m3u8Match = unpacked.match(/source\s*=\s*['"]([^'"]+m3u8[^'"]*)['"]/) ||
                              unpacked.match(/const\s+source\s*=\s*\\['"]([^\\'"]+m3u8[^\\'"]*)\\['"]/);

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
    } catch (_) {}
    return null;
}

function paheDecrypt(fullString, key, v1, v2) {
    const keyIndexMap = {};
    for (let i = 0; i < key.length; i++) keyIndexMap[key[i]] = i;

    let result = "";
    let i = 0;
    const toFind = key[v2];

    while (i < fullString.length) {
        const nextIndex = fullString.indexOf(toFind, i);
        if (nextIndex === -1) break;

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

export async function extractPahe(url) {
    try {
        const initUrl = url.endsWith('/i') ? url : `${url}/i`;

        const initRes = await fetch(initUrl, {
            method: 'GET',
            redirect: 'manual',
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": "https://pahe.win/"
            },
            cfKiller: true,
            skipSizeCheck: true
        });

        const redirectLoc = initRes.headers.get('location') || initRes.headers.get('Location');
        if (!redirectLoc) return null;

        const kwikUrl = redirectLoc.startsWith('http') ? redirectLoc : `https://${redirectLoc.replace(/^\/+/, '')}`;

        const kwikRes = await fetch(kwikUrl, {
            method: 'GET',
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": "https://kwik.cx/"
            },
            cfKiller: true,
            skipSizeCheck: true
        });

        const html = await kwikRes.text();
        const setCookieHeader = kwikRes.headers.get('set-cookie') || kwikRes.headers.get('Set-Cookie');
        let cookie = '';
        if (setCookieHeader) {
            cookie = setCookieHeader.split(';')[0];
        }

        const kwikParamsRegex = /\("(\w+)",\d+,"(\w+)",(\d+),(\d+),\d+\)/;
        const match = html.match(kwikParamsRegex);
        if (!match) return null;

        const [_, fullString, key, v1, v2] = match;
        const decrypted = paheDecrypt(fullString, key, parseInt(v1, 10), parseInt(v2, 10));

        const actionMatch = decrypted.match(/action="([^"]+)"/);
        const tokenMatch = decrypted.match(/value="([^"]+)"/);

        if (!actionMatch || !tokenMatch) return null;

        const postUri = actionMatch[1];
        const token = tokenMatch[1];

        const formData = new URLSearchParams();
        formData.append('_token', token);

        let tries = 0;
        let location = null;

        while (tries < 10) {
            const postRes = await fetch(postUri, {
                method: 'POST',
                redirect: 'manual',
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
                location = postRes.headers.get('location') || postRes.headers.get('Location');
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
    } catch (_) {}
    return null;
}
