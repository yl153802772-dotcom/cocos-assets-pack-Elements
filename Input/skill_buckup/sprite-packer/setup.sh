#!/bin/bash

echo "🔧 安装 Node.js 依赖..."
npm init -y
npm install free-tex-packer-core

echo "🔍 检查系统依赖..."

# 检查 ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg 未安装，请运行: brew install ffmpeg"
else
    echo "✅ ffmpeg 已安装"
fi

# 检查 ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick 未安装，请运行: brew install imagemagick"
else
    echo "✅ ImageMagick 已安装"
fi

echo "📁 创建必要目录..."
mkdir -p /Volumes/OpenClaw/Animation/{source_Ani,frames,frames_scaled,ani_plist,trushvideo}

echo "✅ 技能安装完成！"
echo ""
echo "使用示例:"
echo "  ./run.sh --fps 15 --scale_size 256 --max_texture_size 1024"
echo "  ./run.sh --remove_green_screen false --fps 20"
