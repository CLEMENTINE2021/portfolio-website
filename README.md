# 葛文轩 (Wenxuan Ge) - 个人作品集网站 (Portfolio Showcase)

> 游戏系统策划 · 关卡与物理机制设计作品集展示网站。  
> 采用 **上方横排作品选择 + 下方左侧视频片段选择 + 下方右侧视频展台与说明** 的清晰交互架构。

---

## 核心特性与架构布局

1. **三维联动展示布局**：
   - **上面一排横排（选择作品）**：
     - 横向滚动排列作品卡片，直观展示作品名称、引擎与片段数量。
     - 支持分类筛选（全部、独立游戏、关卡与物理、MOD与工具）。
     - 支持键盘 <kbd>←</kbd> / <kbd>→</kbd> 快速切换作品。
   - **下面左边（选择该作品的不同视频）**：
     - 展示当前选中作品的多个实机演示片段（如核心机制、环境物理、战斗抛弃等）。
     - 标明片段序号、标题、时长与机制看点。
     - 点击即时切换，支持键盘 <kbd>↑</kbd> / <kbd>↓</kbd> 快速切换片段。
   - **下面右边（视频与下方深度说明）**：
     - **上方视频播放器**：选中的片段平滑自动播放，支持静音保护起播、环境漫反射背光、纯文本控制条（播放/暂停、重播、倍速、全屏、连播）。
     - **下方作品说明**：包含项目概述、核心玩法系统亮点、关卡设计与体验节奏、技术架构与实现、操作指南。
     - **行动入口**：纯文字按钮，支持 Itch.io 在线试玩、网盘下载以及复制直达作品深链 (`#overspace`)。

2. **便捷的本地与在线定制**：
   - **拖拽即播**：可直接将本地任意 `.mp4` / `.webm` 拖放至右侧播放器区域即时预览。
   - **可视化作品管理**：点击右上角「管理作品」即可在界面上添加新项目、编辑现有项目、选择本地视频预览，并支持一键导出 `projects.json`。
   - **直接编辑配置文件**：可在 `js/projects.js` 中为每个作品配置 `videos` 数组自由增添片段。

3. **键盘操作体验**：
   - <kbd>←</kbd> 或 <kbd>→</kbd>（或 <kbd>A</kbd> / <kbd>D</kbd>）：在上方横排切换不同作品
   - <kbd>↑</kbd> 或 <kbd>↓</kbd>（或 <kbd>W</kbd> / <kbd>S</kbd>）：在左下方列表切换当前作品的不同视频片段
   - <kbd>Space</kbd>：播放 / 暂停视频
   - <kbd>M</kbd>：开启 / 静音声音
   - <kbd>F</kbd>：全屏播放
   - <kbd>?</kbd>：呼出快捷键指南面板
   - <kbd>Esc</kbd>：退出全屏 / 关闭弹窗

---

## 🚀 快速启动与预览

### 方法 1：运行一键启动脚本（推荐）
在终端中进入项目目录运行：
```bash
cd ~/Projects/portfolio-website
./start.sh
```
服务将在后台启动并在浏览器中打开 `http://localhost:8000`。

### 方法 2：使用 Python 内置 HTTP 服务
```bash
cd ~/Projects/portfolio-website
python3 -m http.server 8000
```
然后在浏览器中访问：`http://localhost:8000`

### 方法 3：直接打开 HTML 文件
由于本站采用纯原生现代技术开发（Vanilla JS + CSS3 + HTML5），也可以直接在文件管理器中双击 [index.html](file:///home/raptor/Projects/portfolio-website/index.html) 在浏览器中打开。*(注：部分浏览器对 file:// 协议本地视频加载存在安全限制，建议优先使用 HTTP 预览)*

---

## 📁 目录结构说明

```
portfolio-website/
├── index.html              # 主页面结构
├── start.sh                # 本地预览一键启动脚本
├── README.md               # 项目使用与配置说明文档
├── css/
│   └── style.css           # 现代化深色黑曜石黑客/赛博风游戏作品集视觉系统
├── js/
│   ├── projects.js         # 作品集静态数据源与个人信息配置
│   └── app.js              # 视频自动播放、环境光、控制条与交互逻辑
└── assets/
    ├── thumbnails/         # 各作品高分辨率封面缩略图
    │   ├── overspace.jpg
    │   ├── gameplay2.jpg
    │   └── gameplay3.jpg
    └── videos/             # 预转换的高清 Web 优化短视频展示片段 (H.264 + FastStart)
        ├── overspace-demo.mp4
        ├── gameplay-demo2.mp4
        └── gameplay-demo3.mp4
```

---

## 🛠️ 如何添加你的新作品

### 方式 A：通过网页可视化界面
1. 访问网站，点击右上角「**⚙️ 管理作品**」按钮。
2. 填写作品名称、所属类别、引擎、副标题、简介与机制亮点。
3. 可直接点击「选择文件」选取你电脑上的本地视频，或者填写在线直链。
4. 点击「**保存并立即生效**」，页面会自动渲染并切换到新作品！
5. 你还可以点击「**导出 projects.json**」备份你的配置。

### 方式 B：直接编辑 `js/projects.js`
打开 [projects.js](file:///home/raptor/Projects/portfolio-website/js/projects.js)，在 `DEFAULT_PROJECTS` 数组中添加新的对象：
```javascript
{
  id: "my-new-game",
  title: "《我的新游戏》",
  subtitle: "核心亮点与玩法介绍",
  category: "独立游戏", // 分类：独立游戏 / 关卡与物理 / MOD与工具 等
  engine: "Godot 4.x",
  year: "2026",
  thumbnail: "assets/thumbnails/my-game.jpg",
  video: "assets/videos/my-game.mp4",
  duration: "00:20",
  links: {
    itch: "https://kineticplanet.itch.io/...",
    github: "https://github.com/..."
  },
  overview: "这里写详细的项目背景与设计心得...",
  systemHighlights: [
    { title: "机制亮点1", desc: "详细规则与设计目标" }
  ],
  controls: "【WASD】移动 | 【鼠标左键】攻击"
}
```
