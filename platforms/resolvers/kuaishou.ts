import type { ParsedMediaResult } from "../../types";
import type { AmagiClient, ParsedMediaUrl } from "../types";
import type { PlatformResolver } from "./types";

const KUAISHOU_SHORT_CODE_REGEX = /^([a-zA-Z0-9_-]+)$/;

async function resolveKuaishouShortCode(shortCode: string): Promise<string> {
  const url = `https://v.kuaishou.com/${shortCode}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.url || url;
  } catch {
    return url;
  }
}

function extractPhotoIdFromUrl(url: string): string | null {
  const shortMatch = url.match(/\/short-video\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];
  const photoMatch = url.match(/\/photo\/([a-zA-Z0-9_-]+)/);
  if (photoMatch) return photoMatch[1];
  return null;
}

export class KuaishouResolver implements PlatformResolver {
  async resolve(
    client: AmagiClient,
    parsed: ParsedMediaUrl,
  ): Promise<ParsedMediaResult> {
    let photoId = parsed.id;

    // If id is a short code (just the code like "KfhlEcGV"), resolve it first
    if (
      !parsed.id.startsWith("http") &&
      KUAISHOU_SHORT_CODE_REGEX.test(parsed.id)
    ) {
      const resolvedUrl = await resolveKuaishouShortCode(parsed.id);
      const extracted = extractPhotoIdFromUrl(resolvedUrl);
      if (extracted) {
        photoId = extracted;
      }
    } else if (parsed.id.startsWith("http")) {
      // If id is a full URL, extract photoId from URL path
      const extracted = extractPhotoIdFromUrl(parsed.id);
      if (extracted) {
        photoId = extracted;
      }
    }
    const result = await client.kuaishou.fetcher.fetchVideoWork({ photoId });

    if (!result.success) {
      const errorInfo = (result.error as any) || {};
      const amagiError = errorInfo.amagiError as any;
      const errorDesc =
        amagiError?.errorDescription || errorInfo.errorDescription || "";
      const errorCode = result.code as any;

      if (
        errorDesc.includes("ck可能已经失效") ||
        errorDesc.includes("接口返回内容为空") ||
        errorCode === "INVALID_COOKIE" ||
        errorCode === "UNKNOWN_ERROR"
      ) {
        throw new Error(
          "快手接口返回内容为空，可能是作品不存在、链接有误或需要登录。请确认链接是否正确，或检查作品是否公开。",
        );
      }
      throw new Error(`快手作品解析失败: ${result.message}`);
    }

    const data = result.data;
    if (!data) {
      throw new Error("快手作品数据为空");
    }

    const detail = data.data?.visionVideoDetail || data;
    const photo = detail.photo || {};
    const authorInfo = detail.author || {};

    const title = photo.caption || "未知标题";
    const author = authorInfo.name || "未知作者";
    const description = photo.caption || "";
    const coverUrl = photo.coverUrl || "";
    const duration = photo.duration ? Math.floor(photo.duration / 1000) : undefined;

    let videoUrl = "";

    if (photo.photoUrl) {
      videoUrl = photo.photoUrl;
    } else if (photo.croppedPhotoUrl) {
      videoUrl = photo.croppedPhotoUrl;
    } else if (
      photo.videoResource?.h264?.adaptationSet?.[0]?.representation?.[0]?.url
    ) {
      videoUrl =
        photo.videoResource.h264.adaptationSet[0].representation[0].url;
    } else if (
      photo.videoResource?.hevc?.adaptationSet?.[0]?.representation?.[0]?.url
    ) {
      videoUrl =
        photo.videoResource.hevc.adaptationSet[0].representation[0].url;
    } else if (photo.manifest?.adaptationSet?.[0]?.representation?.[0]?.url) {
      videoUrl = photo.manifest.adaptationSet[0].representation[0].url;
    }

    const images: string[] = [];
    if (!videoUrl && photo.images && Array.isArray(photo.images)) {
      for (const img of photo.images) {
        const url =
          img?.url ||
          img?.url_list?.[0] ||
          img?.download_addr?.url_list?.[0] ||
          "";
        if (url) images.push(url);
      }
    }

    return {
      title,
      author,
      description,
      coverUrl,
      videoUrl,
      images: images.length > 0 ? images : undefined,
      duration,
      stats: {
        likes: photo.likeCount || photo.likeCnt,
        comments: photo.commentCount || photo.commentCnt,
        views: photo.viewCount || photo.viewCnt,
        shares: photo.shareCount || photo.shareCnt,
      },
    };
  }
}
