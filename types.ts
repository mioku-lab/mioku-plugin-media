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
}

export interface MediaRuntimeState {
  config: MediaConfig;
  amagiClient: any;
}
