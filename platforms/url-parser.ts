import type { ParsedMediaUrl } from "./types";

const BILIBILI_DOMAINS = [
  "bilibili.com",
  "www.bilibili.com",
  "m.bilibili.com",
  "b23.tv",
  "t.bilibili.com",
  "bili2233.cn",
];

const DOUYIN_DOMAINS = [
  "douyin.com",
  "www.douyin.com",
  "v.douyin.com",
  "iesdouyin.com",
  "www.iesdouyin.com",
  "jx.douyin.com",
  "m.douyin.com",
  "jingxuan.douyin.com",
];

const KUAISHOU_DOMAINS = [
  "kuaishou.com",
  "www.kuaishou.com",
  "v.kuaishou.com",
  "v.m.chenzhongtech.com",
  "m.chenzhongtech.com",
  "chenzhongtech.com",
];

const XIAOHONGSHU_DOMAINS = [
  "xiaohongshu.com",
  "www.xiaohongshu.com",
  "xhslink.com",
];

const BV_REGEX = /\b(BV[a-zA-Z0-9]{10,})\b/;
const AV_REGEX = /\b(av(\d+))\b/i;
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
const BILIBILI_LIVE_REGEX = /\/(\d+)(?:\?|$)/;
const DOUYIN_ID_REGEX = /\/video\/(\d+)/;
const KUAISHOU_ID_REGEX = /\/short-video\/([a-zA-Z0-9_-]+)/;
const KUAISHOU_PHOTO_REGEX = /(?:\/fw)?\/photo\/([a-zA-Z0-9_-]+)/;
const XHS_NOTE_REGEX = /\/explore\/([a-f0-9]{24})/;
const XHS_DISCOVERY_REGEX = /\/discovery\/item\/([a-f0-9]{24})/;
const XHSLINK_NOTE_REGEX = /\/([a-f0-9]{24})/;

const KUAISHOU_SHARE_REGEX = /快手[^\n]*快手/;

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

function extractB23UrlFromJsonCard(jsonStr: string): string | null {
  try {
    const json = JSON.parse(jsonStr);
    const meta = json.meta;
    if (meta) {
      for (const key of Object.keys(meta)) {
        const detail = meta[key];
        if (detail.qqdocurl && typeof detail.qqdocurl === "string") {
          return detail.qqdocurl;
        }
        if (detail.qqdocUrl && typeof detail.qqdocUrl === "string") {
          return detail.qqdocUrl;
        }
        if (detail.url && typeof detail.url === "string") {
          const url = detail.url;
          if (url.includes("b23.tv") || url.includes("bilibili.com")) {
            return url;
          }
        }
      }
    }
    if (json.prompt) {
      const urlMatch = json.prompt.match(URL_REGEX);
      if (urlMatch) {
        const url = urlMatch[0];
        if (url.includes("b23.tv") || url.includes("bilibili.com")) {
          return url;
        }
      }
    }
  } catch {
    // not valid JSON
  }
  return null;
}

function matchDomain(hostname: string, domains: string[]): boolean {
  return domains.some((d) => hostname === d || hostname.endsWith("." + d));
}

function parseBilibiliUrl(url: string): ParsedMediaUrl | null {
  const hostname = extractDomain(url);

  if (hostname.includes("b23.tv")) {
    return { platform: "bilibili", id: url, subtype: "video" };
  }

  if (hostname.includes("t.bilibili.com")) {
    const match = url.match(/\/(\d+)/);
    if (match) {
      return { platform: "bilibili", id: match[1], subtype: "article" };
    }
    return null;
  }

  const bvMatch = url.match(BV_REGEX);
  if (bvMatch) {
    return { platform: "bilibili", id: bvMatch[1], subtype: "video" };
  }

  const avMatch = url.match(AV_REGEX);
  if (avMatch) {
    return { platform: "bilibili", id: avMatch[1], subtype: "video" };
  }

  const pathMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+|av\d+)/i);
  if (pathMatch) {
    return { platform: "bilibili", id: pathMatch[1], subtype: "video" };
  }

  if (matchDomain(hostname, BILIBILI_DOMAINS)) {
    const bangumiMatch = url.match(/\/bangumi\/play\/(ep\d+|ss\d+)/);
    if (bangumiMatch) {
      return {
        platform: "bilibili",
        id: bangumiMatch[1],
        subtype: "bangumi",
        extra: { bangumiId: bangumiMatch[1] },
      };
    }

    const articleMatch = url.match(/\/read\/(cv\d+)/i);
    if (articleMatch) {
      return { platform: "bilibili", id: articleMatch[1], subtype: "article" };
    }

    const liveMatch = url.match(/\/live\/(\d+)/);
    if (liveMatch) {
      return { platform: "bilibili", id: liveMatch[1], subtype: "live" };
    }

    if (
      hostname === "live.bilibili.com" ||
      hostname.endsWith(".live.bilibili.com")
    ) {
      const roomMatch = url.match(/\/(\d+)(?:\?|$)/);
      if (roomMatch) {
        return { platform: "bilibili", id: roomMatch[1], subtype: "live" };
      }
    }
  }

  return null;
}

function parseDouyinUrl(url: string): ParsedMediaUrl | null {
  const hostname = extractDomain(url);
  if (!matchDomain(hostname, DOUYIN_DOMAINS)) return null;

  const idMatch = url.match(DOUYIN_ID_REGEX);
  if (idMatch) {
    return { platform: "douyin", id: idMatch[1], subtype: "video" };
  }

  const noteMatch = url.match(/\/note\/(\d+)/);
  if (noteMatch) {
    return { platform: "douyin", id: noteMatch[1], subtype: "video" };
  }

  const modalMatch = url.match(/modal_id=(\d+)/);
  if (modalMatch) {
    return { platform: "douyin", id: modalMatch[1], subtype: "video" };
  }

  return { platform: "douyin", id: url, subtype: "video" };
}

function parseKuaishouUrl(url: string): ParsedMediaUrl | null {
  const hostname = extractDomain(url);
  if (!matchDomain(hostname, KUAISHOU_DOMAINS)) return null;

  const idMatch = url.match(KUAISHOU_ID_REGEX);
  if (idMatch) {
    return { platform: "kuaishou", id: idMatch[1], subtype: "video" };
  }

  const shortMatch = url.match(/\/short-video\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return { platform: "kuaishou", id: shortMatch[1], subtype: "video" };
  }

  const photoMatch = url.match(KUAISHOU_PHOTO_REGEX);
  if (photoMatch) {
    return { platform: "kuaishou", id: photoMatch[1], subtype: "video" };
  }

  // Handle v.kuaishou.com/xxx short URLs like https://v.kuaishou.com/KfhlEcGV
  const shortCodeMatch = url.match(/:\/\/[^/]+\/([a-zA-Z0-9_-]+)/);
  if (shortCodeMatch) {
    return { platform: "kuaishou", id: shortCodeMatch[1], subtype: "video" };
  }

  return null;
}

function parseXiaohongshuUrl(url: string): ParsedMediaUrl | null {
  const hostname = extractDomain(url);
  if (!matchDomain(hostname, XIAOHONGSHU_DOMAINS)) return null;

  const exploreMatch = url.match(XHS_NOTE_REGEX);
  if (exploreMatch) {
    const xsecToken = extractXsecToken(url);
    return {
      platform: "xiaohongshu",
      id: exploreMatch[1],
      subtype: "note",
      extra: xsecToken ? { xsec_token: xsecToken } : undefined,
    };
  }

  const discoveryMatch = url.match(XHS_DISCOVERY_REGEX);
  if (discoveryMatch) {
    const xsecToken = extractXsecToken(url);
    return {
      platform: "xiaohongshu",
      id: discoveryMatch[1],
      subtype: "note",
      extra: xsecToken ? { xsec_token: xsecToken } : undefined,
    };
  }

  if (hostname.includes("xhslink.com")) {
    return { platform: "xiaohongshu", id: url, subtype: "note" };
  }

  const fallbackMatch = url.match(XHSLINK_NOTE_REGEX);
  if (fallbackMatch && fallbackMatch[1].length === 24) {
    const xsecToken = extractXsecToken(url);
    return {
      platform: "xiaohongshu",
      id: fallbackMatch[1],
      subtype: "note",
      extra: xsecToken ? { xsec_token: xsecToken } : undefined,
    };
  }

  return null;
}

function extractXsecToken(url: string): string | null {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("xsec_token") ||
      parsed.searchParams.get("xsec_token")
    );
  } catch {
    const match = url.match(/xsec_token=([^&]+)/);
    return match ? match[1] : null;
  }
}

function parseKuaishouShareText(text: string): ParsedMediaUrl | null {
  if (!KUAISHOU_SHARE_REGEX.test(text)) return null;

  const urlMatch = text.match(URL_REGEX);
  if (urlMatch) {
    return parseKuaishouUrl(urlMatch[0]);
  }

  return { platform: "kuaishou", id: text, subtype: "video" };
}

function parseJsonCardMessage(jsonStr: string): ParsedMediaUrl | null {
  const extractedUrl = extractB23UrlFromJsonCard(jsonStr);
  if (extractedUrl) {
    const hostname = extractDomain(extractedUrl);

    if (hostname.includes("b23.tv") || hostname.includes("bilibili.com")) {
      return parseBilibiliUrl(extractedUrl);
    }

    if (matchDomain(hostname, DOUYIN_DOMAINS)) {
      return parseDouyinUrl(extractedUrl);
    }
    if (matchDomain(hostname, KUAISHOU_DOMAINS)) {
      return parseKuaishouUrl(extractedUrl);
    }
    if (matchDomain(hostname, XIAOHONGSHU_DOMAINS)) {
      return parseXiaohongshuUrl(extractedUrl);
    }

    return { platform: "bilibili", id: extractedUrl, subtype: "video" };
  }

  return null;
}

export function parseMediaUrl(text: string): ParsedMediaUrl | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const bvMatch = trimmed.match(BV_REGEX);
  if (bvMatch && !trimmed.includes("http")) {
    return { platform: "bilibili", id: bvMatch[1], subtype: "video" };
  }

  const avMatch = trimmed.match(AV_REGEX);
  if (avMatch && !trimmed.includes("http")) {
    return { platform: "bilibili", id: avMatch[1], subtype: "video" };
  }

  const urls = trimmed.match(URL_REGEX);
  if (urls) {
    for (const url of urls) {
      const hostname = extractDomain(url);

      if (matchDomain(hostname, BILIBILI_DOMAINS)) {
        return parseBilibiliUrl(url);
      }
      if (matchDomain(hostname, DOUYIN_DOMAINS)) {
        return parseDouyinUrl(url);
      }
      if (matchDomain(hostname, KUAISHOU_DOMAINS)) {
        return parseKuaishouUrl(url);
      }
      if (matchDomain(hostname, XIAOHONGSHU_DOMAINS)) {
        return parseXiaohongshuUrl(url);
      }
    }
  }

  const kuaishouShare = parseKuaishouShareText(trimmed);
  if (kuaishouShare) return kuaishouShare;

  return null;
}

export function extractMediaUrlFromEvent(event: any): ParsedMediaUrl | null {
  const rawText =
    typeof event.raw_message === "string" ? event.raw_message.trim() : "";
  if (rawText) {
    const parsed = parseMediaUrl(rawText);
    if (parsed) return parsed;

    if (rawText.startsWith("{json:")) {
      const jsonStart = rawText.indexOf("{", 0);
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = rawText.slice(jsonStart, jsonEnd + 1);
        const jsonCard = parseJsonCardMessage(jsonStr);
        if (jsonCard) return jsonCard;
      }
    }
  }

  const message = event.message;
  if (Array.isArray(message)) {
    for (const segment of message) {
      if (segment.type === "json") {
        let jsonStr = "";
        if (typeof segment.data === "string") {
          jsonStr = segment.data;
        } else if (segment.data?.data) {
          jsonStr = segment.data.data;
        } else if (typeof segment.data === "object") {
          jsonStr = JSON.stringify(segment.data);
        }
        if (jsonStr) {
          const jsonCard = parseJsonCardMessage(jsonStr);
          if (jsonCard) return jsonCard;
        }
      }

      if (segment.type === "text" && segment.data?.text) {
        const parsed = parseMediaUrl(segment.data.text);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

export function resolveShortUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        resolve(url);
      }, 5000);

      fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        method: "HEAD",
      })
        .then((response) => {
          clearTimeout(timeout);
          resolve(response.url || url);
        })
        .catch(() => {
          clearTimeout(timeout);
          resolve(url);
        });
    } catch {
      resolve(url);
    }
  });
}

export function isShortUrl(parsed: ParsedMediaUrl): boolean {
  if (parsed.platform === "bilibili" && parsed.id.startsWith("http")) {
    return true;
  }
  if (parsed.platform === "xiaohongshu" && parsed.id.includes("xhslink.com")) {
    return true;
  }
  if (parsed.platform === "douyin" && parsed.id.startsWith("http")) {
    return true;
  }
  if (parsed.platform === "kuaishou" && parsed.id.startsWith("http")) {
    return true;
  }
  return false;
}
