import { createAmagiClient } from "@ikenxuan/amagi";
import type { MediaConfig } from "../types";
import type { AmagiClient } from "./types";

export function createMediaAmagiClient(config: MediaConfig): AmagiClient {
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

  const client = createAmagiClient({
    cookies,
    request: { timeout: 15000 },
  });

  return {
    bilibili: {
      fetcher: client.bilibili.fetcher,
    },
    douyin: {
      fetcher: client.douyin.fetcher,
    },
    kuaishou: {
      fetcher: client.kuaishou.fetcher,
    },
    xiaohongshu: {
      fetcher: client.xiaohongshu.fetcher,
    },
  };
}
