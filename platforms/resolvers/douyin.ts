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

    // 判断作品类型：0=视频, 68=图集, 163=文章
    const awemeType = detail.aweme_type;
    const isArticle = awemeType === 163;
    const isVideo = awemeType === 0 || awemeType === 55;
    const isSlides = detail.is_slides === true;

    // 文章类型
    if (isArticle) {
      return this.resolveArticleWork(detail);
    }

    // 图集/合辑类型（包含 images 数组）
    if (!isVideo && !isArticle && detail.images) {
      return this.resolveImageSet(detail, isSlides);
    }

    // 视频类型
    return this.resolveVideoWork(detail);
  }

  private resolveVideoWork(detail: any): ParsedMediaResult {
    const title = detail.desc || detail.item_title || "未知标题";
    const author = detail.author?.nickname || "未知作者";
    const description = detail.desc || "";
    const coverUrl =
      detail.video?.cover?.url_list?.[0] ||
      detail.video?.origin_cover?.url_list?.[0] ||
      detail.video?.dynamic_cover?.url_list?.[0] ||
      "";
    const duration = detail.duration ? Math.floor(detail.duration / 1000) : undefined;

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

  private resolveArticleWork(detail: any): ParsedMediaResult {
    const articleInfo = detail.article_info || {};
    const title = articleInfo.article_title || "未知标题";
    const author = detail.author?.nickname || "未知作者";
    const description = articleInfo.article_content || "";

    // 文章类型的封面图
    const coverUrl =
      detail.video?.origin_cover?.url_list?.[0] ||
      detail.video?.cover?.url_list?.[0] ||
      "";

    const statistics = detail.statistics || detail.stats || {};

    return {
      title,
      author,
      description,
      coverUrl,
      videoUrl: "",
      stats: {
        likes: statistics.digg_count,
        favorites: statistics.collect_count,
        shares: statistics.share_count,
        comments: statistics.comment_count,
        views: statistics.play_count,
      },
    };
  }

  private resolveImageSet(detail: any, isSlides: boolean): ParsedMediaResult {
    const title = detail.preview_title || detail.desc || "未知标题";
    const author = detail.author?.nickname || "未知作者";
    const description = detail.desc || "";
    const statistics = detail.statistics || detail.stats || {};

    // 处理图片列表 - 收集所有静态图片URL
    const images: string[] = [];
    if (detail.images && Array.isArray(detail.images)) {
      for (const img of detail.images) {
        // clip_type: 2=静态图片, 4=短视频, 5=实况图
        // 静态图片优先使用 url_list[0] 或 url_list[1]
        if (img.clip_type === 2 || img.clip_type === undefined) {
          const url =
            img.url_list?.[0] ||
            img.url_list?.[1] ||
            img.download_addr?.url_list?.[0] ||
            "";
          if (url) images.push(url);
        }
      }
    }

    // 获取封面（第一张图或视频封面）
    const coverUrl =
      detail.images?.[0]?.url_list?.[0] ||
      detail.images?.[0]?.url_list?.[1] ||
      detail.video?.cover?.url_list?.[0] ||
      "";

    // 判断是否有实况图（clip_type !== 2）
    const hasLivePhoto = detail.images?.some(
      (img: any) => (img.clip_type ?? 2) !== 2
    );

    // 对于图集/合辑，可能有背景音乐
    let musicUrl = "";
    if (detail.music) {
      if (detail.music.play_url?.uri) {
        musicUrl = detail.music.play_url.uri;
      } else if (detail.music.extra) {
        try {
          const extraData = JSON.parse(detail.music.extra);
          if (extraData.original_song_url) {
            musicUrl = extraData.original_song_url;
          }
        } catch {
          // ignore parse error
        }
      }
    }

    // 收集视频URL（用于短视频或实况图）
    const videoUrls: string[] = [];
    if (detail.images && Array.isArray(detail.images)) {
      for (const img of detail.images) {
        // 短视频或实况图视频
        if (img.clip_type === 4 || img.clip_type === 5) {
          if (img.video?.play_addr_h264?.uri) {
            videoUrls.push(
              `https://aweme.snssdk.com/aweme/v1/play/?video_id=${img.video.play_addr_h264.uri}&ratio=1080p&line=0`
            );
          }
        }
      }
    }

    return {
      title,
      author,
      description,
      coverUrl,
      videoUrl: "",
      images,
      videoUrls,
      musicUrl,
      hasLivePhoto,
      isSlides,
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
