export const REANIME_DOMAINS = [
    "https://reanime.to",
    "https://reanime.cz",
    "https://reanime.wtf"
];

export const REANIME_BASE = "https://reanime.to";
export const FLIXCLOUD_BASE = "https://flixcloud.cc";
export const ENC_DEC_BASE = "https://enc-dec.app";

export const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
export const ANILIST_URL = "https://graphql.anilist.co";
export const ARM_BASE = "https://arm.haglund.dev/api/v2";
export const CINEMETA_URL = "https://v3-cinemeta.strem.io/meta";

export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9"
};

export const FLIX_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "*/*",
    "Origin": FLIXCLOUD_BASE,
    "Referer": `${FLIXCLOUD_BASE}/`
};
