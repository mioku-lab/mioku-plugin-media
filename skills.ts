import type { AISkill, AITool } from "mioku";
import { getMediaRuntimeState } from "./runtime";
import {
  parseMediaUrl,
  resolveShortUrl,
  isShortUrl,
} from "./platforms/url-parser";
import { resolveMedia } from "./platforms/resolvers";
import { buildInfoMessage, sendMediaResult } from "./utils/message";

const mediaSkills: AISkill[] = [
  {
    name: "media",
    description:
      "解析哔哩哔哩、抖音、小红书、快手的视频/图文链接，获取标题、作者、封面和视频地址",
    permission: "member",
    tools: [
      {
        name: "parse_media_url",
        description:
          "解析一个媒体链接，获取视频/图文的标题、作者、封面和视频地址。支持B站、抖音、小红书、快手平台。",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description:
                "需要解析的媒体链接，支持BV号、av号、B站/抖音/小红书/快手链接",
            },
          },
          required: ["url"],
        },
        handler: async (args: any, runtimeCtx?: any) => {
          const runtime = getMediaRuntimeState() as unknown as {
            amagiClient?: Parameters<typeof resolveMedia>[0];
          };
          if (!runtime.amagiClient) {
            return "媒体解析插件尚未初始化";
          }

          const url = String(args?.url || "").trim();
          if (!url) {
            return "缺少 url 参数";
          }

          const parsed = parseMediaUrl(url);
          if (!parsed) {
            return "无法识别该链接，请确认是否为B站/抖音/小红书/快手的有效链接";
          }

          try {
            if (isShortUrl(parsed)) {
              const resolvedUrl = await resolveShortUrl(parsed.id);
              const reParsed = parseMediaUrl(resolvedUrl);
              if (reParsed) {
                Object.assign(parsed, reParsed);
              }
            }

            const result = await resolveMedia(runtime.amagiClient as any, parsed);
            const info = buildInfoMessage(parsed, result);

            const ctx = runtimeCtx?.ctx;
            const event = runtimeCtx?.event || runtimeCtx?.rawEvent;

            if (ctx && event) {
              try {
                await sendMediaResult(ctx, event, parsed, result);
              } catch {
                // send failed, return info text
              }
            }

            return `已解析媒体内容。以下是解析结果，知晓即可：\n${info}${result.videoUrl ? `\n视频地址: ${result.videoUrl}` : ""}`;
          } catch (error) {
            return `解析失败: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      } as AITool,
    ],
  },
];

export default mediaSkills;
