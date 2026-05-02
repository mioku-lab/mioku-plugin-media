import { createAmagiClient } from "@ikenxuan/amagi";
import type { MediaConfig } from "../types";

export function createMediaAmagiClient(config: MediaConfig): any {
  const cookies: Record<string, string> = {};

  if (config.cookies.bilibili?.trim()) {
    cookies.bilibili = config.cookies.bilibili.trim();
  }
  if (config.cookies.douyin?.trim()) {
    cookies.douyin = config.cookies.douyin.trim();
  }
  if (config.cookies.kuaishou?.trim()) {
    cookies.kuaishou = config.cookies.kuaishou.trim();
  }
  if (config.cookies.xiaohongshu?.trim()) {
    cookies.xiaohongshu = config.cookies.xiaohongshu.trim();
  }

  return createAmagiClient({
    cookies,
    request: { timeout: 15000 },
  });
}
