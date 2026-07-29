import { definePlugin, type MiokiContext } from "mioki";
import { getService, Services } from "mioku";
import type { MediaConfig } from "./types";
import { MEDIA_DEFAULTS } from "./config";
import { createMediaAmagiClient } from "./platforms/amagi-client";
import { extractMediaUrlFromEvent, resolveShortUrl, isShortUrl } from "./platforms/url-parser";
import { resolveMedia } from "./platforms/resolvers";
import { sendMediaResult, sendDurationLimitResult } from "./utils/message";
import { handleMediaError } from "./utils/error-handler";
import { createMediaSkills } from "./skills/media";

const REACTION_EMOJI_ID = 60;

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function addReaction(bot: any, messageId: number | string): Promise<void> {
  if (!bot || messageId == null) return;
  try {
    await bot.api("set_msg_emoji_like", {
      message_id: messageId,
      emoji_id: REACTION_EMOJI_ID,
      set: true,
    });
  } catch {
    // ignore reaction errors
  }
}

export default definePlugin({
  name: "media",
  version: "1.0.0",
  description: "流媒体解析插件，支持哔哩哔哩、抖音、小红书和快手平台",

  async setup(ctx: MiokiContext) {
    const configService = getService(ctx, Services.Config);
    const aiService = getService(ctx, Services.AI);
    let config = cloneConfig(MEDIA_DEFAULTS);

    if (configService) {
      await configService.registerConfig("media", "base", config);
      const saved = await configService.getConfig("media", "base");
      if (saved) {
        config = saved as MediaConfig;
      }
    } else {
      ctx.logger.warn("config-service 未加载，media 插件将使用默认配置");
    }

    let amagiClient = createMediaAmagiClient(config);

    if (aiService) {
      for (const skill of createMediaSkills(amagiClient)) aiService.registerSkill(skill);
    }

    const disposers: Array<() => void> = [];
    if (configService) {
      disposers.push(
        configService.onConfigChange("media", "base", (next) => {
          config = next as MediaConfig;
          amagiClient = createMediaAmagiClient(config);
          if (aiService) {
            aiService.removeSkill("media");
            for (const skill of createMediaSkills(amagiClient)) aiService.registerSkill(skill);
          }
        }),
      );
    }

    ctx.handle("message", async (event: any) => {
      if (event.user_id === event.self_id) return;

      const parsed = extractMediaUrlFromEvent(event);
      if (!parsed) return;

      const messageId = event.message_id ?? event.message_seq;

      const platformLabel =
        parsed.platform === "bilibili"
          ? "B站"
          : parsed.platform === "douyin"
            ? "抖音"
            : parsed.platform === "kuaishou"
              ? "快手"
              : "小红书";

      ctx.logger.info(`[media] 检测到${platformLabel}链接，开始解析...`);

      const selfId = event?.self_id != null ? Number(event.self_id) : undefined;
      const bot =
        selfId != null && typeof ctx?.pickBot === "function"
          ? ctx.pickBot(selfId)
          : undefined;

      await addReaction(bot, messageId);

      try {
        if (isShortUrl(parsed)) {
          ctx.logger.info(`[media] 检测到短链接，正在解析: ${parsed.id}`);
          const resolvedUrl = await resolveShortUrl(parsed.id);
          const reParsed = extractMediaUrlFromEvent({ raw_message: resolvedUrl, message: [{ type: "text", data: { text: resolvedUrl } }] });
          if (reParsed) {
            Object.assign(parsed, reParsed);
          } else {
            ctx.logger.warn(`[media] 短链接解析后无法识别: ${resolvedUrl}`);
          }
        }

        const result = await resolveMedia(amagiClient, parsed);

        if (result.duration && config.maxVideoDurationSeconds > 0) {
          if (result.duration > config.maxVideoDurationSeconds) {
            ctx.logger.warn(
              `[media] 视频时长超过限制: ${result.duration}秒 > ${config.maxVideoDurationSeconds}秒`,
            );
            await sendDurationLimitResult(
              ctx,
              event,
              parsed,
              result,
              Math.floor(config.maxVideoDurationSeconds / 60),
            );
            return;
          }
        }

        await sendMediaResult(ctx, event, parsed, result);
      } catch (error) {
        await handleMediaError({
          ctx,
          event,
          error,
          platform: platformLabel,
          config,
        });
      }
    });

    return () => {
      for (const dispose of disposers) dispose();
      if (aiService) aiService.removeSkill("media");
    };
  },
});
