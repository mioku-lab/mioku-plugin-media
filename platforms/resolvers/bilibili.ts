import type { ParsedMediaResult } from "../../types";
import type { ParsedMediaUrl } from "../types";
import type { PlatformResolver } from "./types";

export class BilibiliResolver implements PlatformResolver {
  async resolve(client: any, parsed: ParsedMediaUrl): Promise<ParsedMediaResult> {
    let bvid = parsed.id;
    let avid: number | undefined;

    if (bvid.startsWith("av")) {
      avid = parseInt(bvid.slice(2), 10);
    }

    if (bvid.startsWith("http")) {
      const infoResult = await client.bilibili.fetcher.fetchVideoInfo({ bvid: "" });
      if (!infoResult.success) {
        throw new Error(`B站视频信息获取失败: ${infoResult.message}`);
      }
      const data = infoResult.data?.data || infoResult.data;
      bvid = data?.bvid || "";
      avid = data?.aid;
      if (!bvid) {
        throw new Error("B站短链接解析失败，无法获取BV号");
      }
    }

    const infoResult = await client.bilibili.fetcher.fetchVideoInfo({ bvid });
    if (!infoResult.success) {
      throw new Error(`B站视频信息获取失败: ${infoResult.message}`);
    }

    const infoData = infoResult.data?.data || infoResult.data;
    if (!infoData) {
      throw new Error("B站视频信息为空");
    }

    const title = infoData.title || "未知标题";
    const author = infoData.owner?.name || "未知作者";
    const description = infoData.desc || "";
    const coverUrl = infoData.pic || "";
    const cid = infoData.cid || infoData.pages?.[0]?.cid;
    const aid = infoData.aid || avid || 0;
    const duration = infoData.duration;

    let videoUrl = "";

    if (aid && cid) {
      try {
        const streamResult = await client.bilibili.fetcher.fetchVideoStreamUrl({
          avid: aid,
          cid,
        });

        if (streamResult.success) {
          const streamData = streamResult.data?.data || streamResult.data;
          if (streamData?.durl?.length) {
            videoUrl = streamData.durl[0].url || "";
          } else if (streamData?.dash?.video?.length) {
            const videoItem = streamData.dash.video[0];
            const audioItem = streamData.dash.audio?.[0];
            videoUrl = videoItem.baseUrl || videoItem.base_url || "";
            if (!videoUrl && videoItem.backupUrl?.length) {
              videoUrl = videoItem.backupUrl[0];
            }
            if (!videoUrl && videoItem.backup_url?.length) {
              videoUrl = videoItem.backup_url[0];
            }
          }
        }
      } catch {
        videoUrl = "";
      }
    }

    const stat = infoData.stat || {};

    return {
      title,
      author,
      description,
      coverUrl,
      videoUrl,
      duration,
      stats: {
        likes: stat.like,
        coins: stat.coin,
        favorites: stat.favorite,
        shares: stat.share,
        views: stat.view,
        comments: stat.reply,
        danmaku: stat.danmaku,
      },
    };
  }
}
