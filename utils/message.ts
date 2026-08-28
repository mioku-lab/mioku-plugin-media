import type {
  Bot,
  ForwardSendNode,
  MessageEvent,
  MiokuContext,
} from "mioku";
import { forwardSend } from "mioku";
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

function buildForwardNodes(
  ctx: MiokuContext,
  userId: string,
  nickname: string,
  parsed: ParsedMediaUrl,
  result: ParsedMediaResult,
): ForwardSendNode[] {
  const nodes: ForwardSendNode[] = [];

  const infoText = buildInfoMessage(parsed, result);
  nodes.push({
    user_id: userId,
    nickname,
    content: [ctx.segment.text(infoText)],
  });

  if (result.coverUrl) {
    nodes.push({
      user_id: userId,
      nickname,
      content: [ctx.segment.image(result.coverUrl)],
    });
  }

  if (result.images && result.images.length > 0) {
    for (const imageUrl of result.images) {
      nodes.push({
        user_id: userId,
        nickname,
        content: [ctx.segment.image(imageUrl)],
      });
    }
  }

  if (result.videoUrls && result.videoUrls.length > 0) {
    for (const videoUrl of result.videoUrls) {
      nodes.push({
        user_id: userId,
        nickname,
        content: [ctx.segment.video(videoUrl)],
      });
    }
  } else if (result.videoUrl) {
    nodes.push({
      user_id: userId,
      nickname,
      content: [ctx.segment.video(result.videoUrl)],
    });
  }

  return nodes;
}

interface SendForwardOptions {
  bot: Bot;
  ctx: MiokuContext;
  event: MessageEvent;
  nodes: readonly ForwardSendNode[];
  display: { source: string; news: ReadonlyArray<{ text: string }>; summary: string };
}

function targetFromEvent(event: MessageEvent): { type: "group"; group_id: string } | { type: "private"; user_id: string } {
  return event.message_type === "group" && event.group_id
    ? { type: "group", group_id: String(event.group_id) }
    : { type: "private", user_id: String(event.user_id ?? "") };
}

async function sendForwardMessage(options: SendForwardOptions): Promise<void> {
  const { bot, ctx, event, nodes, display } = options;
  const target = targetFromEvent(event);

  if (bot.supports(forwardSend)) {
    await bot.invoke(forwardSend, {
      target,
      nodes,
      source: display.source,
      news: display.news,
      summary: display.summary,
    });
    return;
  }

  const segments: Array<string | ReturnType<MiokuContext["segment"]["text"]>> = [];
  const header = `${display.source}\n${display.news.map((n) => n.text).join(" / ")}\n${display.summary}`.trim();
  if (header) segments.push(ctx.segment.text(header));
  for (const node of nodes) {
    const content = node.content;
    const list = Array.isArray(content) ? content : [content];
    for (const item of list) {
      if (typeof item === "string") segments.push(ctx.segment.text(item));
      else segments.push(item);
    }
  }
  await bot.sendMessage(target, segments);
}

export async function sendMediaResult(
  ctx: MiokuContext,
  event: MessageEvent,
  parsed: ParsedMediaUrl,
  result: ParsedMediaResult,
): Promise<void> {
  const selfId = event.self_id;
  const bot = selfId != null ? ctx.pickBot(String(selfId)) : undefined;

  if (!bot) {
    await event.reply(buildInfoMessage(parsed, result));
    return;
  }

  const nickname =
    ctx.bot?.nickname ??
    event.sender?.card ??
    event.sender?.nickname ??
    "媒体解析";
  const userId = String(selfId || ctx.bot?.bot_id || event.self_id || 0);

  const nodes = buildForwardNodes(ctx, userId, nickname, parsed, result);
  const summary = buildSummaryText(parsed.platform, parsed.subtype, result.stats);
  const livePrefix = result.liveStatus ? `${result.liveStatus} ` : "";
  const imageCount = result.images?.length ?? 0;
  const videoCount = result.videoUrls?.length ?? 0;

  const extraSummary = [
    imageCount > 0 ? `${imageCount}张图片` : "",
    videoCount > 0 ? `${videoCount}个视频` : "",
  ]
    .filter(Boolean)
    .join(" ");

  await sendForwardMessage({
    bot,
    ctx,
    event,
    nodes,
    display: {
      source: PLATFORM_DISPLAY_TITLES[parsed.platform] || "媒体解析",
      news: [
        { text: truncateText(result.title, 26) },
        { text: result.author },
      ],
      summary: `${livePrefix}${summary} ${extraSummary}`.trim(),
    },
  });
}

export async function sendDurationLimitResult(
  ctx: MiokuContext,
  event: MessageEvent,
  parsed: ParsedMediaUrl,
  result: ParsedMediaResult,
  limitMinutes: number,
): Promise<void> {
  const selfId = event.self_id;
  const bot = selfId != null ? ctx.pickBot(String(selfId)) : undefined;

  if (!bot) {
    await event.reply(
      `【${PLATFORM_NAMES[parsed.platform] || parsed.platform}】视频太大了，发不出来～`,
    );
    return;
  }

  const nickname =
    ctx.bot?.nickname ??
    event.sender?.card ??
    event.sender?.nickname ??
    "媒体解析";
  const userId = String(selfId || ctx.bot?.bot_id || event.self_id || 0);

  const platform = PLATFORM_NAMES[parsed.platform] || parsed.platform;
  const mins = Math.floor((result.duration || 0) / 60);
  const secs = (result.duration || 0) % 60;
  const infoText = `【${platform}】${result.title}\n作者：${result.author}\n时长：${mins}分${secs}秒\n\n哎嘿，视频太大了发不出来～请选择更短的视频（不超过 ${limitMinutes} 分钟）`;

  const nodes: ForwardSendNode[] = [
    {
      user_id: userId,
      nickname,
      content: [ctx.segment.text(infoText)],
    },
  ];

  if (result.coverUrl) {
    nodes.push({
      user_id: userId,
      nickname,
      content: [ctx.segment.image(result.coverUrl)],
    });
  }

  if (result.images && result.images.length > 0) {
    for (const imageUrl of result.images) {
      nodes.push({
        user_id: userId,
        nickname,
        content: [ctx.segment.image(imageUrl)],
      });
    }
  }

  await sendForwardMessage({
    bot,
    ctx,
    event,
    nodes,
    display: {
      source: PLATFORM_DISPLAY_TITLES[parsed.platform] || "媒体解析",
      news: [
        { text: truncateText(result.title, 26) },
        { text: result.author },
      ],
      summary: `视频太长无法发送（${mins}分${secs}秒）`,
    },
  });
}
