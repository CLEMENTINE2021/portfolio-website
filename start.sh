#!/usr/bin/env bash
# 启动作品集网站本地预览服务器
cd "$(dirname "$0")"
PORT=8000

echo "========================================================"
echo " 🚀 正在启动作品集网站 (Portfolio Showcase)..."
echo " 🌐 访问地址: http://localhost:${PORT}"
echo " 💡 提示: 浏览器中访问即可体验左侧选作品、右侧自动播放视频！"
echo " ⌨️ 快捷键: [↑]/[↓] 切作品 | [空格] 播放/暂停 | [M] 声音 | [F] 全屏"
echo "========================================================"

# 如果存在 xdg-open，可在后台尝试打开浏览器
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:${PORT}") &
fi

python3 server.py ${PORT}
