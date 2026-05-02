import type { ParsedMediaResult } from "../../types";
import type { ParsedMediaUrl } from "../types";
import type { PlatformResolver } from "./types";

export class DouyinResolver implements PlatformResolver {
  async resolve(client: any, parsed: ParsedMediaUrl): Promise<ParsedMediaResult> {
    const awemeId = parsed.id;

    const result = await client.douyin.fetcher.parseWork({ aweme_id: awemeId });
    if (!result.success) {
      const err = new Error(`抖音作品解析失败: ${result.message}`);
      (err as any).cause = result;
      throw err;
    }

    const data = result.data;
    if (!data) {
      throw new Error("抖音作品数据为空");
    }

    const detail = data.aweme_detail || data;
    const title = detail.desc || detail.item_title || "未知标题";
    const author = detail.author?.nickname || "未知作者";
    const description = detail.desc || "";
    const coverUrl =
      detail.video?.cover?.url_list?.[0] ||
      detail.video?.origin_cover?.url_list?.[0] ||
      detail.video?.dynamic_cover?.url_list?.[0] ||
      "";
    const duration = detail.duration;

    let videoUrl = "";

    if (detail.video) {
      videoUrl =
        detail.video?.play_addr?.url_list?.[0] ||
        detail.video?.download_addr?.url_list?.[0] ||
        "";

      if (!videoUrl && detail.video?.bit_rate?.length) {
        const bestBitrate = detail.video.bit_rate.reduce(
          (best: any, curr: any) =>
            (curr.bit_rate || 0) > (best.bit_rate || 0) ? curr : best,
          detail.video.bit_rate[0],
        );
        videoUrl =
          bestBitrate?.play_addr?.url_list?.[0] || "";
      }
    }

    const images: string[] = [];
    if (detail.images && Array.isArray(detail.images)) {
      for (const img of detail.images) {
        const url =
          img?.url_list?.[0] ||
          img?.download_addr?.url_list?.[0] ||
          "";
        if (url) images.push(url);
      }
    }

    const statistics = detail.statistics || detail.stats || {};

    return {
      title,
      author,
      description,
      coverUrl,
      videoUrl,
      duration,
      stats: {
        likes: statistics.digg_count,
        favorites: statistics.collect_count,
        shares: statistics.share_count,
        comments: statistics.comment_count,
        views: statistics.play_count,
      },
    };
  }
}
