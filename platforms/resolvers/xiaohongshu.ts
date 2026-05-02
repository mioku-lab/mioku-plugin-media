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

      return {
        title,
        author,
        description,
        coverUrl,
        videoUrl: "",
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

    return {
      title,
      author,
      description,
      coverUrl,
      videoUrl,
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
