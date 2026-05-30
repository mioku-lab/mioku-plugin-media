export interface MediaConfig {
  cookies: {
    bilibili: string;
    douyin: string;
    kuaishou: string;
    xiaohongshu: string;
  };
  maxVideoDurationSeconds: number;
  debug: boolean;
}

export const MEDIA_DEFAULTS: MediaConfig = {
  cookies: {
    bilibili: "",
    douyin: "",
    kuaishou: "",
    xiaohongshu: "",
  },
  maxVideoDurationSeconds: 20 * 60,
  debug: false,
};
