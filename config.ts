export interface MediaConfig {
  cookies: {
    bilibili: string;
    douyin: string;
    kuaishou: string;
    xiaohongshu: string;
  };
  debug: boolean;
}

export const MEDIA_DEFAULTS: MediaConfig = {
  cookies: {
    bilibili: "",
    douyin: "",
    kuaishou: "",
    xiaohongshu: "",
  },
  debug: false,
};
