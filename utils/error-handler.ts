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
  const { ctx, event, error, platform, config } = options;
  const errorMessage = normalizeErrorMessage(error);

  ctx.logger.error(`[media] ${platform} 解析失败: ${errorMessage}`, error);

  const cause = (error instanceof Error && (error as any).cause) ? (error as any).cause : null;
  const ckExpired = cause?.error?.errorDescription?.includes("ck可能已经失效");
  const a1Empty = errorMessage.includes("a1Value cannot be empty");

  if (ckExpired) {
    await event.reply(`${platform} Cookie 已失效，请联系管理员更新`, true);
    return;
  }

  if (a1Empty) {
    if (platform === "小红书") {
      await event.reply(`小红书解析需要配置 Cookie，请联系管理员配置小红书 Cookie后重试`, true);
      return;
    }
  }

  if (config.debug) {
    await event.reply(`${platform} 解析失败: ${errorMessage}`, true);
    return;
  }

  const aiService = ctx.services?.ai as any | undefined;
  const chatRuntime = aiService?.getChatRuntime?.();

  if (chatRuntime) {
    try {
      await chatRuntime.generateNotice({
        event,
        instruction: `媒体解析插件在解析${platform}内容时失败，错误信息: ${errorMessage}。请简短告知用户解析失败，并建议稍后重试或检查链接是否有效。`,
        send: true,
        promptInjections: [
          {
            title: "Media Plugin Notice",
            content:
              "A media link parsing action was triggered. Judge whether the user likely intended this action or triggered it accidentally. If it looks accidental or like a casual mention, weave a natural reply into the conversation without mentioning the plugin, tools, or commands. If the user seems to want this feature, respond helpfully. Keep the response concise.",
          },
        ],
      });
      return;
    } catch (noticeError) {
      ctx.logger.error(`[media] AI notice 发送失败: ${normalizeErrorMessage(noticeError)}`, noticeError);
    }
  }

  await event.reply(`解析失败，请稍后重试或检查链接是否有效`, true);
}
