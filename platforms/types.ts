export type Platform = "bilibili" | "douyin" | "kuaishou" | "xiaohongshu";

export interface ParsedMediaUrl {
  platform: Platform;
  id: string;
  subtype?: "video" | "article" | "note" | "bangumi" | "live";
  extra?: Record<string, string>;
}

export interface AmagiClient {
  bilibili: {
    fetcher: {
      fetchVideoInfo(options: { bvid: string; typeMode?: "strict" | "loose" }): Promise<{
        success: boolean;
        data?: any;
        message?: string;
      }>;
      fetchVideoStreamUrl(options: { avid: number; cid: number; typeMode?: "strict" | "loose" }): Promise<{
        success: boolean;
        data?: any;
        message?: string;
      }>;
      fetchLiveRoomInfo(options: { room_id: string; typeMode?: "strict" | "loose" }): Promise<{
        success: boolean;
        data?: any;
        message?: string;
      }>;
      fetchLiveRoomInitInfo(options: { room_id: string; typeMode?: "strict" | "loose" }): Promise<{
        success: boolean;
        data?: any;
        message?: string;
      }>;
      fetchUserCard(options: { host_mid: number; typeMode?: "strict" | "loose" }): Promise<{
        success: boolean;
        data?: any;
        message?: string;
      }>;
    };
  };
  kuaishou: {
    fetcher: {
      fetchVideoWork(options: {
        photoId: string;
        typeMode?: "strict" | "loose";
      }): Promise<{
        success: boolean;
        code?: number | string | undefined;
        data: any;
        message?: string;
        error?: any;
      }>;
    };
  };
  douyin: {
    fetcher: {
      parseWork(options: {
        aweme_id: string;
        typeMode?: "strict" | "loose";
      }): Promise<{
        success: boolean;
        data?: any;
        message?: string;
      }>;
    };
  };
  xiaohongshu: {
    fetcher: {
      fetchNoteDetail(options: {
        note_id: string;
        xsec_token: string;
        typeMode?: "strict" | "loose";
      }): Promise<{
        success: boolean;
        data?: any;
        message?: string;
      }>;
    };
  };
}
