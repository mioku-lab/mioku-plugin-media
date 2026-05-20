export type Platform = "bilibili" | "douyin" | "kuaishou" | "xiaohongshu";

export interface ParsedMediaUrl {
  platform: Platform;
  id: string;
  subtype?: "video" | "article" | "note" | "bangumi" | "live";
  extra?: Record<string, string>;
}

export interface AmagiClient {
  kuaishou: {
    fetcher: {
      fetchVideoWork(options: { photoId: string; typeMode?: "strict" | "loose" }): Promise<{
        success: boolean;
        code?: number;
        data: any;
        message?: string;
      }>;
    };
  };
}
