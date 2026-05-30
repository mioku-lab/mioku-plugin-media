---
title: 媒体解析配置
description: 配置各平台 Cookie 和调试选项
fields:
  - key: base.cookies.bilibili
    label: 哔哩哔哩 Cookie
    type: textarea
    description: B站 Cookie，配置后可获取更高质量的视频流。留空则使用基础解析。

  - key: base.cookies.douyin
    label: 抖音 Cookie
    type: textarea
    description: 抖音 Cookie，配置后可获取无水印视频。留空则使用基础解析。

  - key: base.cookies.kuaishou
    label: 快手 Cookie
    type: textarea
    description: 快手 Cookie，配置后可正常解析作品。留空则无法解析。

  - key: base.cookies.xiaohongshu
    label: 小红书 Cookie
    type: textarea
    description: 小红书 Cookie，配置后可获取笔记详情和视频。留空则使用基础解析。

  - key: base.debug
    label: 调试模式
    type: switch
    description: 开启后解析失败时直接发送错误信息，不走 AI 通知

  - key: base.maxVideoDurationSeconds
    label: 视频解析时长上限
    type: number
    description: 允许解析的视频最大时长（秒），默认 1200（20分钟）。超过限制的视频将被拒绝解析。
---
