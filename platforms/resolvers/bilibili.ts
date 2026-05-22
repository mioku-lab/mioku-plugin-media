import type { ParsedMediaResult } from "../../types";
import type { ParsedMediaUrl } from "../types";
import type { PlatformResolver } from "./types";

export class BilibiliResolver implements PlatformResolver {
  private readonly BV_REGEX = /\b(BV[a-zA-Z0-9]{10,})\b/;
  private readonly AV_REGEX = /\b(av\d+)\b/i;

  async resolve(client: any, parsed: ParsedMediaUrl): Promise<ParsedMediaResult> {
    if (parsed.subtype === "live") {
      return this.resolveLive(client, parsed);
    }

    // 如果 id 是短链接 URL，先尝试解析出 BV 号
    let bvid = parsed.id;
    let avid: number | undefined;

    if (bvid.startsWith("http")) {
      // 尝试从 URL 中直接提取 BV 号
      const bvMatch = bvid.match(this.BV_REGEX);
      const avMatch = bvid.match(this.AV_REGEX);
      if (bvMatch) {
        bvid = bvMatch[1];
      } else if (avMatch) {
        // 如果是 AV 号，先转换成 BV 号
        avid = parseInt(avMatch[1].replace("av", ""), 10);
        try {
          const infoResult = await client.bilibili.fetcher.fetchVideoInfo({ bvid: `av${avid}` });
          if (infoResult.success) {
            const data = infoResult.data?.data || infoResult.data;
            bvid = data?.bvid || "";
            avid = data?.aid;
          }
        } catch {
          // ignore conversion errors
        }
        if (!bvid) {
          throw new Error("B站短链接解析失败，无法获取BV号");
        }
      } else {
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

  private async resolveLive(client: any, parsed: ParsedMediaUrl): Promise<ParsedMediaResult> {
    const roomId = parsed.id;

    try {
      const [liveInfoResult, initInfoResult] = await Promise.all([
        client.bilibili.fetcher.fetchLiveRoomInfo({
          room_id: roomId,
        }),
        client.bilibili.fetcher.fetchLiveRoomInitInfo({
          room_id: roomId,
        }),
      ]);

      if (!liveInfoResult.success) {
        throw new Error(`B站直播间信息获取失败: ${liveInfoResult.message}`);
      }

      const liveData = liveInfoResult.data?.data || liveInfoResult.data;
      if (!liveData) {
        throw new Error("B站直播间信息为空");
      }

      const initData = initInfoResult.data?.data || initInfoResult.data;
      const anchorUid = initData?.uid || liveData.uid;

      let author = "未知主播";
      if (anchorUid) {
        try {
          const userCardResult = await client.bilibili.fetcher.fetchUserCard({
            host_mid: Number(anchorUid),
          });
          if (userCardResult.success) {
            const cardData = userCardResult.data?.data || userCardResult.data;
            author = cardData?.card?.uname || cardData?.uname || author;
          }
        } catch {
          // ignore user card fetch errors
        }
      }

      const title = liveData.title || "未知标题";
      const description = liveData.description || "";
      const coverUrl = liveData.user_cover || liveData.cover || "";
      const liveStatus = liveData.live_status;
      const isLive = liveStatus === 1;
      const online = liveData.online || 0;
      const attention = liveData.attention || 0;

      return {
        title,
        author,
        description,
        coverUrl,
        videoUrl: isLive ? `https://live.bilibili.com/${roomId}` : "",
        duration: 0,
        stats: {
          likes: 0,
          coins: 0,
          favorites: 0,
          shares: 0,
          views: online,
          comments: attention,
          danmaku: 0,
        },
        liveStatus: isLive ? "直播中" : "未开播",
      };
    } catch (error) {
      throw new Error(`B站直播间解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
