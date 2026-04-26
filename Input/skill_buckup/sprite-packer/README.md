# 视频转精灵表技能

## 完整流水线
1. 读取 `/Volumes/OpenClaw/Animation/source_Ani` 中的视频
2. FFmpeg 抽帧 → `/Volumes/OpenClaw/Animation/frames`
3. 去除绿幕 + 去除豆包水印
4. 缩放到指定尺寸 → `/Volumes/OpenClaw/Animation/frames_scaled`
5. 智能打包精灵表 → `/Volumes/OpenClaw/Animation/ani_plist`
6. 视频归档 → `/Volumes/OpenClaw/Animation/trushvideo`

## 安装依赖
```bash
cd ~/.openclaw/skills/sprite-packer
./setup.sh

```


## 参数说明
cat > ~/.openclaw/skills/sprite-packer/README.md << 'EOF'
# Sprite Packer 技能使用说明

## 快速开始

```bash
cd ~/.openclaw/skills/sprite-packer
./run.sh --remove_background true
完整参数列表
基础参数
参数	默认值	说明
--fps	10	抽帧帧率
--scale_size	512	缩放尺寸(px)
--skip_extract	false	跳过抽帧
--skip_scale	false	跳过缩放
去背景参数
参数	默认值	说明
--remove_background	false	启用去背景
--remove_watermark	false	去除豆包水印
--remove_white_edge	false	去除白边
--bg_color	"6FB16B"	背景色(十六进制)
--bg_fuzz	15	颜色容差(%)
--bg_erode	2	边缘侵蚀(像素)
--bg_blur	1	边缘羽化
--bg_white_threshold	80	白边阈值(%)
--bg_crop_shave	25	裁剪边缘(像素)
--bg_crop_top	0	上边裁剪
--bg_crop_right	0	右边裁剪
--bg_crop_bottom	0	下边裁剪
--bg_crop_left	0	左边裁剪
打包参数
参数	默认值	说明
--size_mode	auto	尺寸模式(auto/fixed)
--max_texture_size	4096	最大纹理尺寸
--allow_rotation	false	允许旋转优化
--padding	2	图片间距
使用示例
1. 基础去背景
bash
./run.sh --remove_background true --bg_color "6FB16B" --bg_fuzz 15
2. 去背景 + 去水印 + 去白边
bash
./run.sh --remove_background true --remove_watermark true --remove_white_edge true
3. 精细调参（针对豆包绿幕）
bash
./run.sh --remove_background true \
  --bg_color "6FB16B" \
  --bg_fuzz 25 \
  --bg_erode 3 \
  --bg_blur 1.5 \
  --bg_crop_shave 30 \
  --bg_crop_top 20 \
  --bg_crop_right 10 \
  --bg_crop_bottom 10
4. 快速模式（跳过抽帧，只打包）
bash
./run.sh --skip_extract true --scale_size 256
5. 完整流水线（抽帧→去背景→缩放→打包）
bash
./run.sh --fps 10 --scale_size 126 --remove_background true --remove_watermark true
参数调优建议
问题	解决方案
绿幕去不干净	增大 --bg_fuzz (20-30)
角色边缘被误删	减小 --bg_fuzz (8-12)
有白边残留	增大 --bg_erode (3-4)
边缘锯齿	增大 --bg_blur (1.5-2)
水印残留	开启 --remove_watermark true
角色被裁剪	减小 --bg_crop_* 参数
```

## 目录结构
```text
/Volumes/OpenClaw/Animation/
├── source_Ani/          # 放原始视频（处理后移动到 trushvideo）
├── frames/              # 抽帧临时目录（处理后清空）
├── frames_processed/    # 去绿幕/水印临时目录（处理后清空）
├── frames_scaled/       # 缩放临时目录（处理后移动到 trushplist）
├── ani_plist/           # 最终输出（plist + png）
├── trushvideo/          # 已处理的视频归档
├── trushpng/            # 原始大小图片归档
└── trushplist/          # 缩放后图片归档
```
