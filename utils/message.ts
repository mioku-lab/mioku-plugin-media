import type {
  SendNodeElement,
  SendNodeContentElement,
  ForwardDisplayOptions,
} from "napcat-sdk";
import type { ParsedMediaResult, MediaStats } from "../types";
import type { ParsedMediaUrl } from "../platforms/types";

const PLATFORM_NAMES: Record<string, string> = {
  bilibili: "哔哩哔哩",
  douyin: "抖音",
  kuaishou: "快手",
  xiaohongshu: "小红书",
};

const PLATFORM_DISPLAY_TITLES: Record<string, string> = {
  bilibili: "bilibili视频解析",
  douyin: "抖音视频解析",
  kuaishou: "快手视频解析",
  xiaohongshu: "小红书笔记解析",
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return "";
  const cleaned = text.replace(/\n/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + "...";
}

function formatCount(count?: number): string {
  if (count == null) return "0";
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿`;
  if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
  return String(count);
}

export function buildInfoMessage(
  parsed: ParsedMediaUrl,
  result: ParsedMediaResult,
): string {
  const platform = PLATFORM_NAMES[parsed.platform] || parsed.platform;
  const lines: string[] = [];

  lines.push(`【${platform}】${result.title}`);
  lines.push(`作者：${result.author}`);

  if (result.liveStatus) {
    lines.push(`状态：${result.liveStatus}`);
  }

  if (result.duration && result.duration > 0) {
    lines.push(`时长：${formatDuration(result.duration)}`);
  }

  const desc = truncateText(result.description, 200);
  if (desc) {
    lines.push(`简介：${desc}`);
  }

  // 对于图片内容，显示数量信息
  if (result.images && result.images.length > 0) {
    lines.push(`图片：${result.images.length}张`);
  }
  if (result.videoUrls && result.videoUrls.length > 0) {
    lines.push(`视频：${result.videoUrls.length}个`);
  }

  return lines.join("\n");
}

function buildSummaryText(
  platform: string,
  subtype: string | undefined,
  stats?: MediaStats,
): string {
  if (!stats) return "";

  const parts: string[] = [];

  if (platform === "bilibili") {
    if (subtype === "live") {
      if (stats.views != null && stats.views > 0)
        parts.push(`在线${formatCount(stats.views)}`);
      if (stats.comments != null && stats.comments > 0)
        parts.push(`关注${formatCount(stats.comments)}`);
    } else {
      if (stats.likes != null) parts.push(`赞${formatCount(stats.likes)}`);
      if (stats.coins != null) parts.push(`币${formatCount(stats.coins)}`);
      if (stats.favorites != null)
        parts.push(`藏${formatCount(stats.favorites)}`);
      if (stats.shares != null) parts.push(`转${formatCount(stats.shares)}`);
    }
  } else {
    if (stats.likes != null) parts.push(`赞${formatCount(stats.likes)}`);
    if (stats.favorites != null)
      parts.push(`藏${formatCount(stats.favorites)}`);
    if (stats.shares != null) parts.push(`转${formatCount(stats.shares)}`);
    if (stats.comments != null) parts.push(`评${formatCount(stats.comments)}`);
  }

  return parts.join(" ");
}

function buildForwardDisplay(
  parsed: ParsedMediaUrl,
  result: ParsedMediaResult,
): ForwardDisplayOptions {
  const displayTitle = PLATFORM_DISPLAY_TITLES[parsed.platform] || "媒体解析";

  let summary = buildSummaryText(parsed.platform, parsed.subtype, result.stats);

  if (result.liveStatus) {
    summary = summary ? `${result.liveStatus} ${summary}` : result.liveStatus;
  }

  // 对于图片集/合辑，增加内容数量信息
  if (result.images && result.images.length > 0) {
    const imageInfo = `${result.images.length}张图片`;
    summary = summary ? `${imageInfo} ${summary}` : imageInfo;
  }
  if (result.videoUrls && result.videoUrls.length > 0) {
    const videoInfo = `${result.videoUrls.length}个视频`;
    summary = summary ? `${videoInfo} ${summary}` : videoInfo;
  }

  return {
    source: displayTitle,
    news: [{ text: truncateText(result.title, 26) }, { text: result.author }],
    summary,
  };
}

function normalizeNodeContent(content: any[]): any[] {
  return content.map((element: any) => {
    if (
      element &&
      typeof element === "object" &&
      "type" in element &&
      "data" in element
    ) {
      return element;
    }
    if (element && typeof element === "object" && "type" in element) {
      const { type, ...data } = element;
      return { type, data };
    }
    return element;
  });
}

function buildForwardNodes(
  ctx: any,
  userId: string,
  nickname: string,
  parsed: ParsedMediaUrl,
  result: ParsedMediaResult,
): SendNodeElement[] {
  const nodes: SendNodeElement[] = [];

  // 简介文字优先
  const infoText = buildInfoMessage(parsed, result);
  nodes.push({
    type: "node",
    user_id: userId,
    nickname,
    content: [ctx.segment.text(infoText)],
  } as SendNodeContentElement);

  if (result.coverUrl) {
    nodes.push({
      type: "node",
      user_id: userId,
      nickname,
      content: [ctx.segment.image(result.coverUrl)],
    } as SendNodeContentElement);
  }

  // 处理图片集/合辑
  if (result.images && result.images.length > 0) {
    // 如果既有图片又有视频/实况图，发送纯图片
    // 否则直接发送图片
    for (const imageUrl of result.images) {
      nodes.push({
        type: "node",
        user_id: userId,
        nickname,
        content: [ctx.segment.image(imageUrl)],
      } as SendNodeContentElement);
    }
  }

  // 处理短视频/实况图视频
  if (result.videoUrls && result.videoUrls.length > 0) {
    for (const videoUrl of result.videoUrls) {
      nodes.push({
        type: "node",
        user_id: userId,
        nickname,
        content: [(ctx.segment as any).video(videoUrl)],
      } as SendNodeContentElement);
    }
  }

  // 处理常规视频（单个视频）
  if (result.videoUrl && (!result.videoUrls || result.videoUrls.length === 0)) {
    nodes.push({
      type: "node",
      user_id: userId,
      nickname,
      content: [(ctx.segment as any).video(result.videoUrl)],
    } as SendNodeContentElement);
  }

  return nodes;
}

function toOneBotForwardFormat(nodes: SendNodeElement[]): any[] {
  return nodes.map((node) => {
    if (node.type !== "node") return node;

    if ("id" in node && node.id) {
      return {
        type: "node",
        data: {
          user_id: (node as any).user_id,
          nickname: (node as any).nickname,
          id: node.id,
        },
      };
    }

    const contentNode = node as SendNodeContentElement;
    const content = Array.isArray(contentNode.content)
      ? normalizeNodeContent(contentNode.content)
      : [];

    return {
      type: "node",
      data: {
        user_id: contentNode.user_id,
        nickname: contentNode.nickname,
        content,
      },
    };
  });
}

export async function sendMediaResult(
  ctx: any,
  event: any,
  parsed: ParsedMediaUrl,
  result: ParsedMediaResult,
): Promise<void> {
  const selfId = event?.self_id != null ? Number(event.self_id) : undefined;
  const bot =
    selfId != null && typeof ctx?.pickBot === "function"
      ? ctx.pickBot(selfId)
      : undefined;

  if (!bot) {
    await event.reply(buildInfoMessage(parsed, result));
    return;
  }

  const nickname = String(
    ctx?.bot?.nickname ||
      event?.sender?.card ||
      event?.sender?.nickname ||
      "媒体解析",
  );
  const userId = String(selfId || ctx?.bot?.bot_id || event?.self_id || 0);

  const nodes = buildForwardNodes(ctx, userId, nickname, parsed, result);
  const forwardPayload = toOneBotForwardFormat(nodes);
  const display = buildForwardDisplay(parsed, result);

  if (event?.message_type === "group" && event?.group_id != null) {
    await bot.api("send_group_forward_msg", {
      group_id: event.group_id,
      messages: forwardPayload,
      source: display.source,
      news: display.news,
      summary: display.summary,
    });
    return;
  }

  if (event?.user_id != null) {
    await bot.api("send_private_forward_msg", {
      user_id: event.user_id,
      messages: forwardPayload,
      source: display.source,
      news: display.news,
      summary: display.summary,
    });
  }
}

export async function sendDurationLimitResult(
  ctx: any,
  event: any,
  parsed: ParsedMediaUrl,
  result: ParsedMediaResult,
  limitMinutes: number,
): Promise<void> {
  const selfId = event?.self_id != null ? Number(event.self_id) : undefined;
  const bot =
    selfId != null && typeof ctx?.pickBot === "function"
      ? ctx.pickBot(selfId)
      : undefined;

  if (!bot) {
    await event.reply(
      `【${PLATFORM_NAMES[parsed.platform] || parsed.platform}】视频太大了，发不出来～`,
    );
    return;
  }

  const nickname = String(
    ctx?.bot?.nickname ||
      event?.sender?.card ||
      event?.sender?.nickname ||
      "媒体解析",
  );
  const userId = String(selfId || ctx?.bot?.bot_id || event?.self_id || 0);

  const nodes: SendNodeElement[] = [];

  const platform = PLATFORM_NAMES[parsed.platform] || parsed.platform;
  const mins = Math.floor((result.duration || 0) / 60);
  const secs = (result.duration || 0) % 60;
  const infoText = `【${platform}】${result.title}\n作者：${result.author}\n时长：${mins}分${secs}秒\n\n哎嘿，视频太大了发不出来～请选择更短的视频（不超过 ${limitMinutes} 分钟）`;

  nodes.push({
    type: "node",
    user_id: userId,
    nickname,
    content: [ctx.segment.text(infoText)],
  } as SendNodeContentElement);

  if (result.coverUrl) {
    nodes.push({
      type: "node",
      user_id: userId,
      nickname,
      content: [ctx.segment.image(result.coverUrl)],
    } as SendNodeContentElement);
  }

  // 只发图片，不发视频
  if (result.images && result.images.length > 0) {
    for (const imageUrl of result.images) {
      nodes.push({
        type: "node",
        user_id: userId,
        nickname,
        content: [ctx.segment.image(imageUrl)],
      } as SendNodeContentElement);
    }
  }

  const forwardPayload = toOneBotForwardFormat(nodes);
  const displayTitle = PLATFORM_DISPLAY_TITLES[parsed.platform] || "媒体解析";

  if (event?.message_type === "group" && event?.group_id != null) {
    await bot.api("send_group_forward_msg", {
      group_id: event.group_id,
      messages: forwardPayload,
      source: displayTitle,
      news: [{ text: truncateText(result.title, 26) }, { text: result.author }],
      summary: `视频太长无法发送（${mins}分${secs}秒）`,
    });
    return;
  }

  if (event?.user_id != null) {
    await bot.api("send_private_forward_msg", {
      user_id: event.user_id,
      messages: forwardPayload,
      source: displayTitle,
      news: [{ text: truncateText(result.title, 26) }, { text: result.author }],
      summary: `视频太长无法发送（${mins}分${secs}秒）`,
    });
  }
}
