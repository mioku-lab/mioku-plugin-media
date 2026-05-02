# mioku-plugin-media

流媒体解析插件，自动识别并解析哔哩哔哩、抖音、小红书和快手平台的视频/图文链接。

## 功能

- 自动检测消息中的平台链接，无需命令前缀
- 支持哔哩哔哩、抖音、小红书、快手四大平台
- 返回封面图、标题、作者、简介和视频文件
- 可选配置各平台 Cookies 以获取更高质量的视频

## 支持平台

### 哔哩哔哩
- 域名：bilibili.com、b23.tv、t.bilibili.com、bili2233.cn
- 支持纯 BV 号（BV...）和 av 号（av...）格式

### 抖音
- 域名：douyin.com、iesdouyin.com 及子域名（www, v, jx, m, jingxuan）

### 快手
- 域名：kuaishou.com、v.kuaishou.com
- 支持 APP 分享文本格式（如"快手...快手"）

### 小红书
- 域名：xiaohongshu.com、xhslink.com

## 配置

通过 WebUI 配置页面或直接编辑配置文件：

```json
{
  "cookies": {
    "bilibili": "",
    "douyin": "",
    "kuaishou": "",
    "xiaohongshu": ""
  },
  "debug": false
}
```