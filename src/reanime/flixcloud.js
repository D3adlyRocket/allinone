import { FLIXCLOUD_BASE, ENC_DEC_BASE, USER_AGENT, FLIX_HEADERS } from './constants.js';

function getUrlOrigin(url) {
    if (!url) return FLIXCLOUD_BASE;
    const match = url.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : FLIXCLOUD_BASE;
}

function safeAtob(str) {
    if (typeof atob === 'function') return atob(str);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    str = String(str).replace(/=+$/, '');
    for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++);
        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
            bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
        buffer = chars.indexOf(buffer);
    }
    return output;
}

function parseBytes(val) {
    if (!val) return new Uint8Array(0);
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
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
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
    return json5
        .replace(/([{,]\s*)([\w_]+)(\s*:)/g, '$1"$2"$3')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/:\s*undefined\b/g, ': null');
}

function extractBalancedObject(source, startIdx) {
    const start = source.indexOf("{", startIdx);
    if (start < 0) return null;
    let depth = 0, quote = null, escape = false;
    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (escape) escape = false;
            else if (ch === "\\") escape = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; }
        else if (ch === "{") { depth++; }
        else if (ch === "}") { depth--; if (depth === 0) return source.substring(start, i + 1); }
    }
    return null;
}

function parseSsrData(html) {
    const dataMatch = html.match(/type:\s*"data",\s*data:\s*(\{.*?\})\s*,\s*uses:/s);
    if (dataMatch) {
        try {
            const rawJson = json5ToJson(dataMatch[1]);
            return JSON.parse(rawJson);
        } catch (e) {}
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
                } catch (e) {}
            }
            dataIdx = html.lastIndexOf("{", dataIdx - 1);
        }
    }
    throw new Error("Failed to extract FlixCloud SSR data");
}

export async function extractFlixCloudDownload(embedUrl) {
    try {
        const match = embedUrl.match(/\/e\/([a-z0-9]+)/i);
        const aid = match ? match[1] : null;
        if (!aid) return null;

        const dlHeaders = {
            "Accept": "*/*",
            "Referer": `${FLIXCLOUD_BASE}/`,
            "User-Agent": USER_AGENT
        };

        const res = await fetch(`${FLIXCLOUD_BASE}/d/${aid}/__data.json`, {
            headers: dlHeaders,
            cfKiller: true,
            skipSizeCheck: true
        });

        if (!res.ok) return null;
        const dataBody = await res.text();

        const fileIdMatch = dataBody.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const tokenMatch = dataBody.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
        const baseMatch = dataBody.match(/https:\/\/fetch\d*\.flixcloud\.cc/);
        const resolutionMatch = dataBody.match(/(\d{3,4}p)/);

        const fileId = fileIdMatch ? fileIdMatch[0] : null;
        const token = tokenMatch ? tokenMatch[0] : null;
        const base = baseMatch ? baseMatch[0] : FLIXCLOUD_BASE;
        const resolution = resolutionMatch ? resolutionMatch[1] : null;

        if (!fileId || !token) return null;

        let ready = false;
        for (let attempts = 0; !ready && attempts < 2; attempts++) {
            try {
                const progRes = await fetch(`${base}/download/${fileId}/progress?token=${token}`, {
                    headers: dlHeaders,
                    cfKiller: true,
                    skipSizeCheck: true
                });
                if (progRes.ok) {
                    const text = await progRes.text();
                    if (text.includes('"status":"ready"') || text.includes('"ready"')) {
                        ready = true;
                        break;
                    }
                    if (text.includes('"status":"failed"')) break;
                }
            } catch (_) {}
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
}

export async function extractFlixCloud(embedUrl, referer) {
    const pageUrl = normalizeFlixEmbedUrl(embedUrl);
    const origin = getUrlOrigin(pageUrl);

    const response = await fetch(pageUrl, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "*/*",
            "Origin": origin,
            "Referer": `${FLIXCLOUD_BASE}/`
        },
        cfKiller: true,
        skipSizeCheck: true
    });

    if (!response.ok) throw new Error(`FlixCloud embed HTTP ${response.status}`);
    const html = await response.text();

    const data = parseSsrData(html);

    const rawSubtitles = Array.isArray(data.subtitles) ? data.subtitles : [];
    const subtitles = rawSubtitles.map(sub => ({
        url: sub.url,
        language: sub.language || sub.lang || "Unknown",
        format: sub.format || (sub.url.endsWith(".ass") ? "ass" : sub.url.endsWith(".vtt") ? "vtt" : "srt"),
        default: !!sub.default
    }));

    try {
        const remoteStream = await decryptFlixCloudRemote(data, origin);
        return {
            url: remoteStream.streamUrl,
            videoId: data.video_id,
            title: data.video_title,
            subtitles: subtitles,
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

    const fields = await deriveFieldMap(seed);
    const cryptoParts = extractObfuscatedCryptoData(obfuscated, fields);

    const frag2Val = data[fields.keyFrag2Field];
    const tokenRef = data[fields.tokenField];

    if (!frag2Val || !tokenRef) {
        throw new Error("FlixCloud token fields missing");
    }

    const tokenResponse = await fetch(`${origin}/api/m3u8/${tokenRef}`, {
        headers: {
            "User-Agent": USER_AGENT,
            "Origin": origin,
            "Referer": `${FLIXCLOUD_BASE}/`
        },
        cfKiller: true,
        skipSizeCheck: true
    });

    if (!tokenResponse.ok) throw new Error(`FlixCloud token HTTP ${tokenResponse.status}`);
    const tokenJson = await tokenResponse.json();

    const videoKey = (await sha256Hex(tokenRef + "vid")).substring(0, 10);
    const keyKey = (await sha256Hex(tokenRef + "key")).substring(0, 10);

    const encryptedUrlB64 = tokenJson[videoKey];
    const tokenKeyVal = tokenJson[keyKey];

    if (!encryptedUrlB64 || !tokenKeyVal) {
        throw new Error("FlixCloud token response incomplete");
    }

    const wasmKey = await _runInterpretedWasmTransform(
        wPayload,
        parseBytes(cryptoParts.frag1B64),
        parseBytes(frag2Val),
        parseBytes(tokenKeyVal),
        parseInt(seed.substring(0, 8), 16)
    );

    const streamUrl = await decryptAesCbcUrl(wasmKey, cryptoParts.ivB64, encryptedUrlB64, seed);
    const cleanStreamUrl = streamUrl.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();

    return {
        url: cleanStreamUrl,
        videoId: data.video_id,
        title: data.video_title,
        subtitles: subtitles,
        headers: {
            "Referer": `${FLIXCLOUD_BASE}/`,
            "User-Agent": USER_AGENT
        }
    };
}

async function decryptFlixCloudRemote(data, origin) {
    const cleanData = Object.assign({}, data);
    delete cleanData.subtitles;
    delete cleanData.intro_chapter;
    delete cleanData.outro_chapter;

    const resolveResponse = await fetch(`${ENC_DEC_BASE}/api/dec-flixcloud?type=token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "User-Agent": USER_AGENT
        },
        body: JSON.stringify({ data: cleanData })
    });
    if (!resolveResponse.ok) throw new Error(`Token API HTTP ${resolveResponse.status}`);
    const resolveJson = await resolveResponse.json();

    const result = resolveJson.result || resolveJson;
    const token = result.token || (result.context && result.context.token);
    const context = result.context || result;

    if (!token) throw new Error("Missing token in resolve response");

    const tokenResponse = await fetch(`${origin}/api/m3u8/${token}`, {
        headers: {
            "User-Agent": USER_AGENT,
            "Origin": origin,
            "Referer": `${FLIXCLOUD_BASE}/`
        },
        cfKiller: true,
        skipSizeCheck: true
    });
    if (!tokenResponse.ok) throw new Error(`Token authorization HTTP ${tokenResponse.status}`);
    const tokenJson = await tokenResponse.json();

    const decryptResponse = await fetch(`${ENC_DEC_BASE}/api/dec-flixcloud?type=stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "User-Agent": USER_AGENT
        },
        body: JSON.stringify({
            data: {
                context: context,
                stream_response: tokenJson
            }
        })
    });
    if (!decryptResponse.ok) throw new Error(`Stream decrypt HTTP ${decryptResponse.status}`);
    const decryptJson = await decryptResponse.json();

    const stream = decryptJson.result?.stream || decryptJson.result?.url || decryptJson.result;
    if (!stream || typeof stream !== 'string') {
        throw new Error("Invalid stream returned from decrypt API");
    }

    const wPayload = decryptJson.result?.context?.w_payload || context?.w_payload || '';
    const cleanStream = stream.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
    const parseUrl = `${ENC_DEC_BASE}/api/parse-flixcloud?url=${encodeURIComponent(cleanStream)}&w_payload=${encodeURIComponent(wPayload)}`;

    return {
        streamUrl: parseUrl,
        rawStreamUrl: cleanStream
    };
}

async function deriveFieldMap(seed) {
    let first = seed;
    for (let i = 0; i < 3; i++) first = await sha256Hex(first + String(i));
    let second = first;
    for (let i = 0; i < 3; i++) second = await sha256Hex(second + String(i));
    return {
        keyField: `kf_${first.substring(8, 16)}`,
        ivField: `ivf_${first.substring(16, 24)}`,
        containerName: `cd_${first.substring(24, 32)}`,
        arrayName: `ad_${first.substring(32, 40)}`,
        objectName: `od_${first.substring(40, 48)}`,
        tokenField: `${first.substring(48, 64)}_${first.substring(56, 64)}`,
        keyFrag2Field: `${second.substring(0, 16)}_${second.substring(16, 24)}`
    };
}

function extractObfuscatedCryptoData(data, fields) {
    const container = data[fields.containerName];
    const arr = container?.[fields.arrayName];
    const obj = arr?.[0]?.[fields.objectName];
    if (!obj) throw new Error("Invalid FlixCloud crypto data structure");
    return { frag1B64: obj[fields.keyField], ivB64: obj[fields.ivField] };
}

async function _runInterpretedWasmTransform(payloadB64, frag1, frag2, tokenKey, seedInt) {
    const wasmBytes = parseBytes(payloadB64);
    const bodies = _wasmFunctionBodies(wasmBytes);
    const len = frag1.length;
    const memory = new Uint8Array(4096 + len * 4);
    const p1 = 1000, p2 = p1 + len, p3 = p2 + len, out = p3 + len;
    memory.set(frag1, p1); memory.set(frag2, p2); memory.set(tokenKey, p3);
    const ok = _executeWasmBody(bodies[1], [p1, p2, p3, out, len], [seedInt], memory);
    if (!ok) throw new Error("WASM execution failed");
    return memory.subarray(out, out + len);
}

function _wasmFunctionBodies(bytes) {
    const bodies = []; let cursor = 8;
    const readUleb = () => {
        let res = 0, shift = 0;
        while (cursor < bytes.length) {
            const b = bytes[cursor++]; res |= (b & 0x7f) << shift;
            if ((b & 0x80) === 0) break; shift += 7;
        }
        return res;
    };
    while (cursor < bytes.length) {
        const id = bytes[cursor++]; const size = readUleb(); const end = cursor + size;
        if (id === 10) {
            const count = readUleb();
            for (let i = 0; i < count; i++) { const bSize = readUleb(); bodies.push(bytes.subarray(cursor, cursor + bSize)); cursor += bSize; }
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
            const b = body[pc++]; res |= (b & 0x7f) << shift;
            if ((b & 0x80) === 0) break; shift += 7;
        }
        return res;
    };
    const readSleb = () => {
        let res = 0, shift = 0, b = 0;
        do { b = body[pc++]; res |= (b & 0x7f) << shift; shift += 7; } while ((b & 0x80) !== 0);
        if (shift < 32 && (b & 0x40) !== 0) res |= (~0 << shift);
        return res | 0;
    };
    const locals = params.slice(); const lCount = readUleb();
    for (let i = 0; i < lCount; i++) { const c = readUleb(); pc++; for (let j = 0; j < c; j++) locals.push(0); }
    const blockEnds = _wasmBlockEnds(body, pc);
    const stack = [], cStack = []; let steps = 0;
    const branch = (depth) => {
        const idx = cStack.length - 1 - depth; if (idx < 0) return false;
        const frame = cStack[idx];
        if (frame.isLoop) { cStack.length = idx + 1; pc = frame.startPc; }
        else { cStack.length = idx; pc = frame.endPc + 1; }
        return true;
    };
    while (pc < body.length && steps++ < 1000000) {
        const opPc = pc, op = body[pc++];
        switch (op) {
            case 0x02: case 0x03: pc++; cStack.push({ isLoop: op === 0x03, startPc: pc, endPc: blockEnds.get(opPc) }); break;
            case 0x0b: if (cStack.length === 0) return true; cStack.pop(); break;
            case 0x0c: if (!branch(readUleb())) return false; break;
            case 0x0d: { const d = readUleb(); if (stack.pop() !== 0) branch(d); break; }
            case 0x20: stack.push(locals[readUleb()] | 0); break;
            case 0x21: locals[readUleb()] = stack.pop() || 0; break;
            case 0x23: stack.push(globals[readUleb()] | 0); break;
            case 0x41: stack.push(readSleb()); break;
            case 0x2d: { readUleb(); const off = readUleb(); const addr = (stack.pop() || 0) + off; stack.push(memory[addr] || 0); break; }
            case 0x3a: { readUleb(); const off = readUleb(); const val = stack.pop() || 0; const addr = (stack.pop() || 0) + off; memory[addr] = val & 0xff; break; }
            case 0x45: stack.push((stack.pop() || 0) === 0 ? 1 : 0); break;
            case 0x4f: { const r = (stack.pop() || 0) >>> 0, l = (stack.pop() || 0) >>> 0; stack.push(l >= r ? 1 : 0); break; }
            case 0x6a: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push((l + r) | 0); break; }
            case 0x6b: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push((l - r) | 0); break; }
            case 0x6c: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push(Math.imul(l, r)); break; }
            case 0x71: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push(l & r); break; }
            case 0x72: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push(l | r); break; }
            case 0x73: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push(l ^ r); break; }
            case 0x74: { const s = (stack.pop() || 0) & 31, v = stack.pop() || 0; stack.push(v << s); break; }
            case 0x76: { const s = (stack.pop() || 0) & 31, v = stack.pop() || 0; stack.push(v >>> s); break; }
        }
    }
    return true;
}

function _wasmBlockEnds(body, start) {
    const ends = new Map(), stack = []; let pc = start;
    const readUleb = () => { while (pc < body.length && (body[pc++] & 0x80) !== 0) {} };
    while (pc < body.length) {
        const opPc = pc, op = body[pc++];
        switch (op) {
            case 0x02: case 0x03: pc++; stack.push(opPc); break;
            case 0x0b: if (stack.length > 0) ends.set(stack.pop(), opPc); break;
            case 0x0c: case 0x0d: case 0x20: case 0x21: case 0x23: case 0x41: readUleb(); break;
            case 0x2d: case 0x3a: readUleb(); readUleb(); break;
        }
    }
    return ends;
}

function uint8ArrayToWordArray(arr) {
    const CryptoJS = require('crypto-js');
    const words = [];
    for (let i = 0; i < arr.length; i++) {
        words[i >>> 2] |= (arr[i] & 0xff) << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, arr.length);
}

async function decryptAesCbcUrl(rawKey, ivVal, cipherB64, seed) {
    let CryptoJS = null;
    try { CryptoJS = require('crypto-js'); } catch (e) {}

    if (CryptoJS && CryptoJS.AES && typeof CryptoJS.AES.decrypt === 'function') {
        try {
            const salt = CryptoJS.enc.Utf8.parse(seed);
            const passphrase = uint8ArrayToWordArray(rawKey);
            const iv = uint8ArrayToWordArray(parseBytes(ivVal));
            const derivedKey = CryptoJS.PBKDF2(passphrase, salt, { keySize: 256 / 32, iterations: 1000, hasher: CryptoJS.algo.SHA256 });
            const keyBytes = new Uint8Array(32);
            for (let i = 0; i < 32; i++) { keyBytes[i] = (derivedKey.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff; }
            for (let i = 0; i < 32; i++) { keyBytes[i] ^= seed.charCodeAt(i % seed.length); }
            const finalKey = CryptoJS.SHA256(uint8ArrayToWordArray(keyBytes));
            const decrypted = CryptoJS.AES.decrypt(cipherB64, finalKey, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
            const result = decrypted.toString(CryptoJS.enc.Utf8);
            if (result) return result.trim();
        } catch (e) {}
    }
    throw new Error("Local decryption failed");
}

async function sha256Hex(text) {
    const CryptoJS = require('crypto-js');
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
}
