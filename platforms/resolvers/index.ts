import type { ParsedMediaUrl } from "../types";
import type { ParsedMediaResult } from "../../types";
import type { PlatformResolver } from "./types";
import { BilibiliResolver } from "./bilibili";
import { DouyinResolver } from "./douyin";
import { KuaishouResolver } from "./kuaishou";
import { XiaohongshuResolver } from "./xiaohongshu";

const resolvers: Record<string, PlatformResolver> = {
  bilibili: new BilibiliResolver(),
  douyin: new DouyinResolver(),
  kuaishou: new KuaishouResolver(),
  xiaohongshu: new XiaohongshuResolver(),
};

export async function resolveMedia(
  client: any,
  parsed: ParsedMediaUrl,
): Promise<ParsedMediaResult> {
  const resolver = resolvers[parsed.platform];
  if (!resolver) {
    throw new Error(`不支持的平台: ${parsed.platform}`);
  }
  return resolver.resolve(client, parsed);
}

export { BilibiliResolver, DouyinResolver, KuaishouResolver, XiaohongshuResolver };
