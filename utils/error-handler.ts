import type { MiokiContext } from "mioki";
import type { MediaConfig } from "../types";

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function handleMediaError(options: {
  ctx: MiokiContext;
  event: any;
  error: unknown;
  platform: string;
  config: MediaConfig;
}): Promise<void> {
  const { ctx, event, error, platform } = options;
  const errorMessage = normalizeErrorMessage(error);
  ctx.logger.error(`[media] ${platform} 解析失败: ${errorMessage}`);

  // 尝试获取 bot 发送错误信息给用户
  const selfId = event?.self_id != null ? Number(event.self_id) : undefined;
  const bot =
    selfId != null && typeof ctx?.pickBot === "function"
      ? ctx.pickBot(selfId)
      : undefined;

  if (!bot) return;

  const nickname = String(
    ctx?.bot?.nickname ||
      event?.sender?.card ||
      event?.sender?.nickname ||
      "媒体解析",
  );
  const userId = String(selfId || event?.self_id || 0);

  // 构建错误提示消息
  const errorText = `【${platform}】解析失败\n${errorMessage}`;

  try {
    if (event?.message_type === "group" && event?.group_id != null) {
      await bot.sendGroupMsg(event.group_id, [ctx.segment.text(errorText)]);
      return;
    }
    if (event?.user_id != null) {
      await bot.sendPrivateMsg(event.user_id, [ctx.segment.text(errorText)]);
    }
  } catch {
    // ignore send errors
  }
}
