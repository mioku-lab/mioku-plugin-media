import type { ParsedMediaResult } from "../../types";
import type { ParsedMediaUrl } from "../types";
import type { PlatformResolver } from "./types";

export class XiaohongshuResolver implements PlatformResolver {
  async resolve(client: any, parsed: ParsedMediaUrl): Promise<ParsedMediaResult> {
    const noteId = parsed.id;
    const xsecToken = parsed.extra?.xsec_token || "";

    if (!xsecToken && !parsed.id.startsWith("http")) {
      throw new Error("小红书笔记解析需要 xsec_token，请确保链接包含完整参数");
    }

    const result = await client.xiaohongshu.fetcher.fetchNoteDetail({
      note_id: noteId,
      xsec_token: xsecToken,
    });

    if (!result.success) {
      throw new Error(`小红书笔记解析失败: ${result.message}`);
    }

    const data = result.data;
    if (!data) {
      throw new Error("小红书笔记数据为空");
    }

    const items = data.data?.items || data.items || [];
    const noteCard = items[0]?.note_card || items[0]?.note_card;

    if (!noteCard) {
      const noteData = data.data || data;
      const title = noteData.title || "未知标题";
      const author = noteData.user?.nickname || "未知作者";
      const description = noteData.desc || "";
      const coverUrl =
        noteData.image_list?.[0]?.url ||
        noteData.image_list?.[0]?.url_default ||
        noteData.image_list?.[0]?.url_pre ||
        "";

      // 收集图片列表
      const images: string[] = [];
      if (noteData.image_list && Array.isArray(noteData.image_list)) {
        for (const img of noteData.image_list) {
          const url =
            img?.url ||
            img?.url_default ||
            img?.url_pre ||
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
        videoUrl: "",
        images: images.length > 0 ? images : undefined,
        stats: buildXhsStats(noteData.interact_info),
      };
    }

    const title = noteCard.title || "未知标题";
    const author = noteCard.user?.nickname || "未知作者";
    const description = noteCard.desc || "";
    const coverUrl =
      noteCard.image_list?.[0]?.url ||
      noteCard.image_list?.[0]?.url_default ||
      noteCard.image_list?.[0]?.url_pre ||
      "";

    let videoUrl = "";
    if (noteCard.type === "video" && noteCard.video) {
      const video = noteCard.video;
      videoUrl =
        video.media?.stream?.h264?.[0]?.master_url ||
        video.media?.stream?.h264?.[0]?.backup_urls?.[0] ||
        video.media?.stream?.h265?.[0]?.master_url ||
        video.media?.stream?.h265?.[0]?.backup_urls?.[0] ||
        video.consumer?.origin_video_key ||
        "";
    }

    // 收集图片列表
    const images: string[] = [];
    if (noteCard.image_list && Array.isArray(noteCard.image_list)) {
      for (const img of noteCard.image_list) {
        const url =
          img?.url ||
          img?.url_default ||
          img?.url_pre ||
          img?.download_addr?.url_list?.[0] ||
          "";
        if (url) images.push(url);
      }
    }

    // 判断是否有实况图（检查是否有 stream 数据）
    const hasLivePhoto = noteCard.image_list?.some(
      (img: any) => img.live_photo && img.stream
    );

    // 收集实况图视频流URL
    const videoUrls: string[] = [];
    if (noteCard.image_list && Array.isArray(noteCard.image_list)) {
      for (const img of noteCard.image_list) {
        if (img.stream) {
          // 按优先级 h264 > h265 > av1 > h266
          const streamData = img.stream;
          if (streamData.h264?.length > 0) {
            videoUrls.push(streamData.h264[0].master_url);
          } else if (streamData.h265?.length > 0) {
            videoUrls.push(streamData.h265[0].master_url);
          } else if (streamData.av1?.length > 0) {
            videoUrls.push(streamData.av1[0].master_url);
          }
        }
      }
    }

    return {
      title,
      author,
      description,
      coverUrl,
      videoUrl,
      images: images.length > 0 ? images : undefined,
      videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
      hasLivePhoto,
      stats: buildXhsStats(noteCard.interact_info),
    };
  }
}

function buildXhsStats(interactInfo: any): import("../../types").MediaStats {
  if (!interactInfo) return {};
  return {
    likes: parseInt(interactInfo.like_count, 10) || undefined,
    favorites: parseInt(interactInfo.collect_count, 10) || undefined,
    comments: parseInt(interactInfo.comment_count, 10) || undefined,
    shares: parseInt(interactInfo.share_count, 10) || undefined,
  };
}