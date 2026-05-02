import type { ParsedMediaResult } from "../../types";
import type { ParsedMediaUrl } from "../types";
import type { PlatformResolver } from "./types";

export class KuaishouResolver implements PlatformResolver {
  async resolve(client: any, parsed: ParsedMediaUrl): Promise<ParsedMediaResult> {
    const photoId = parsed.id;

    const result = await client.kuaishou.fetcher.fetchVideoWork({ photoId });
    if (!result.success) {
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
    const duration = photo.duration;

    let videoUrl = "";

    if (photo.photoUrl) {
      videoUrl = photo.photoUrl;
    } else if (photo.croppedPhotoUrl) {
      videoUrl = photo.croppedPhotoUrl;
    } else if (photo.videoResource?.h264?.adaptationSet?.[0]?.representation?.[0]?.url) {
      videoUrl = photo.videoResource.h264.adaptationSet[0].representation[0].url;
    } else if (photo.videoResource?.hevc?.adaptationSet?.[0]?.representation?.[0]?.url) {
      videoUrl = photo.videoResource.hevc.adaptationSet[0].representation[0].url;
    } else if (photo.manifest?.adaptationSet?.[0]?.representation?.[0]?.url) {
      videoUrl = photo.manifest.adaptationSet[0].representation[0].url;
    }

    return {
      title,
      author,
      description,
      coverUrl,
      videoUrl,
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
