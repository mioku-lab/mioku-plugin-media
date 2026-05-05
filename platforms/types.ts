export type Platform = "bilibili" | "douyin" | "kuaishou" | "xiaohongshu";

export interface ParsedMediaUrl {
  platform: Platform;
  id: string;
  subtype?: "video" | "article" | "note" | "bangumi" | "live";
  extra?: Record<string, string>;
}
