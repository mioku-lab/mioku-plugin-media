import type { MediaConfig } from "./config";

export type { MediaConfig };

export interface MediaStats {
  likes?: number;
  coins?: number;
  favorites?: number;
  shares?: number;
  views?: number;
  comments?: number;
  danmaku?: number;
}

export interface ParsedMediaResult {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  videoUrl: string;
  duration?: number;
  stats?: MediaStats;
  liveStatus?: string;
  /** 图集/合辑的图片列表 */
  images?: string[];
  /** 图集/合辑的短视频/实况图视频URL列表 */
  videoUrls?: string[];
  /** 图集/合辑的背景音乐URL */
  musicUrl?: string;
  /** 是否包含实况图 */
  hasLivePhoto?: boolean;
  /** 是否为合辑（图集中的多图组合） */
  isSlides?: boolean;
}

export interface MediaRuntimeState {
  config: MediaConfig;
  amagiClient: any;
}
