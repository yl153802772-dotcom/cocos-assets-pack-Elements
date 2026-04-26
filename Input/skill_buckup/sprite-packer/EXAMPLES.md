# Sprite Packer 技能 - 助手使用范例

## 技能描述
将视频自动转换为精灵表（Spritesheet）和 Cocos2D plist 文件。

**支持功能：**
- 🎬 FFmpeg 抽帧（可调帧率）
- 🖼️ 高级去背景（色度键 + 边缘侵蚀 + 羽化）
- 🚰 豆包水印去除
- 📐 智能缩放（sips）
- 📦 精灵表打包（自动计算最优尺寸）
- 🗄️ 分阶段归档（视频/原图/缩放图）

## 目录结构
/Volumes/OpenClaw/Animation/
├── source_Ani/ # 放入视频文件
├── ani_plist/ # 输出 plist + png
├── trushvideo/ # 视频归档
├── trushpng/ # 原始图片归档
└── trushplist/ # 缩放图片归档

text

## 完整参数说明

### 基础参数
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--fps` | number | 10 | 抽帧帧率 |
| `--scale_size` | number | 512 | 缩放尺寸（像素） |
| `--skip_extract` | boolean | false | 跳过抽帧 |
| `--skip_scale` | boolean | false | 跳过缩放 |

### 去背景参数（核心）
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--remove_background` | boolean | false | 启用去背景 |
| `--remove_watermark` | boolean | false | 去除豆包水印 |
| `--remove_white_edge` | boolean | false | 去除白边 |
| `--bg_color` | string | "6FB16B" | 背景色（十六进制，不带#） |
| `--bg_fuzz` | number | 15 | 颜色容差（%），越大去得越多 |
| `--bg_erode` | number | 2 | 边缘侵蚀（像素），去白边 |
| `--bg_blur` | number | 1 | 边缘羽化，让过渡自然 |
| `--bg_white_threshold` | number | 80 | 白边阈值（%），越高越激进 |
| `--bg_crop_shave` | number | 25 | 预裁剪边缘（像素） |
| `--bg_crop_top` | number | 0 | 上边裁剪 |
| `--bg_crop_right` | number | 0 | 右边裁剪 |
| `--bg_crop_bottom` | number | 0 | 下边裁剪 |
| `--bg_crop_left` | number | 0 | 左边裁剪 |

### 打包参数
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--size_mode` | string | auto | auto/fixed |
| `--max_texture_size` | number | 2048 | 最大纹理尺寸 |
| `--allow_rotation` | boolean | false |不步允许旋转优化 |
| `--padding` | number | 2 | 图片间距 |

## 参数调优速查表

| 问题 | 解决方案 |
|------|----------|
| 绿幕去不干净 | 增大 `--bg_fuzz` 到 20-30 |
| 角色边缘被误删 | 减小 `--bg_fuzz` 到 8-12 |
| 角色周围有白边 | 增大 `--bg_erode` 到 3-4 |
| 边缘锯齿明显 | 增大 `--bg_blur` 到 1.5-2 |
| 水印残留 | 开启 `--remove_watermark true` |
| 四角有绿幕 | 增大 `--bg_crop_shave` 到 30-40 |
| 角色被裁剪 | 减小 `--bg_crop_*` 参数 |

## 助手使用范例

### 范例1：基础打包（无去背景）
**用户说：** "帮我打包视频生成精灵表"

**助手动作：**
```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --remove_background false
```
范例2：去绿幕打包
用户说： "视频有绿幕，帮我去掉绿幕再打包"

助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --remove_background true --bg_color "6FB16B" --bg_fuzz 15
```
范例3：去绿幕 + 去水印 + 去白边
用户说： "视频有绿幕和豆包水印，还有白边，帮我处理干净"

助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --remove_background true --remove_watermark true --remove_white_edge true --bg_fuzz 20 --bg_erode 3
```
范例4：指定抽帧率和缩放尺寸
用户说： "抽15帧，缩放到256像素"

助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --fps 15 --scale_size 256 --remove_background false
```
范例5：高质量模式
用户说： "高质量打包，允许旋转优化，最大纹理4096"

助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --allow_rotation true --max_texture_size 4096 --fps 20 --scale_size 512 --remove_background false
``
范例6：快速原型模式
用户说： "快速生成一个小尺寸的精灵表，只要256大小"

助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --scale_size 256 --max_texture_size 1024 --fps 5 --remove_background false
```
范例7：完整流水线（推荐）
用户说： "把视频处理成精灵表，抽15帧，缩放到512，去绿幕去水印，开启旋转优化"

助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --fps 15 --scale_size 512 --remove_background true --remove_watermark true --allow_rotation true --bg_fuzz 20 --bg_erode 2
```

范例8：精细调参（针对豆包视频）
用户说： "豆包的绿幕颜色不准，帮我调一下参数，背景色是6FB16B，容差25，侵蚀3"


助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --remove_background true --bg_color "6FB16B" --bg_fuzz 25 --bg_erode 3 --bg_blur 1.5 --bg_crop_shave 30
```

范例9：只缩放和打包（不重新抽帧）
用户说： "之前已经抽帧过了，只需要重新缩放和打包，缩放到256"


## 助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --skip_extract true --scale_size 256 --remove_background false
```

范例10：裁剪白边（角色位置固定）
用户说： "人物上面有20像素白边，右边10像素，下边10像素，左边不要裁"

## 助手动作：

```bash
cd ~/.openclaw/skills/sprite-packer && ./run.sh --remove_background true --bg_crop_top 20 --bg_crop_right 10 --bg_crop_bottom 10 --bg_crop_left 0
```

## 参数映射表（用户说法 → 命令参数）
```text
用户说法	对应参数
"抽帧率/每秒抽多少帧"	--fps
"缩放大小/缩放到多少像素"	--scale_size
"去绿幕/去除绿幕/抠绿幕"	--remove_background true
"去水印/去除水印/去掉豆包水印"	--remove_watermark true
"去白边/去除白边"	--remove_white_edge true
"背景色/绿幕颜色"	--bg_color
"容差/敏感度"	--bg_fuzz
"边缘侵蚀/去白边强度"	--bg_erode
"边缘羽化/边缘平滑"	--bg_blur
"旋转优化/允许旋转/节省空间"	--allow_rotation true
"最大纹理/最大尺寸"	--max_texture_size
"快速模式/低质量"	--fps 5 --scale_size 128
"高质量模式/精细打包"	--fps 20 --scale_size 512 --allow_rotation true
"不重新抽帧/只打包"	--skip_extract true
"裁剪上边/下边/左边/右边"	--bg_crop_top/bottom/left/right
输出示例
成功时返回：

json
{
  "status": "success",
  "duration_seconds": "27.8",
  "summary": {
    "frames_extracted": 100,
    "images_processed": 100,
    "images_scaled": 100,
    "plist_files": 1,
    "png_files": 1
  },
  "output": {
    "files": ["animation_1734567890123.plist", "animation_1734567890123.png"],
    "output_dir": "/Volumes/OpenClaw/Animation/ani_plist",
    "texture_size": { "width": 2048, "height": 2048 }
  }
}
```

## 常见问题
```text
Q: 如何只打包已有的图片？
A: 使用 --skip_extract true 跳过抽帧步骤。

Q: 如何关闭去背景？
A: 设置 --remove_background false（默认就是关闭的）。

Q: 生成的 plist 太大怎么办？
A: 减小 --scale_size（如 256）或减小 --max_texture_size（如 1024）。

Q: 图片太多放不下一张图怎么办？
A: 增大 --max_texture_size（最大 8192）或减小 --scale_size。

Q: 去背景后角色边缘有锯齿？
A: 增大 --bg_blur 到 1.5-2，让边缘平滑。

Q: 去背景后角色被误删了一部分？
A: 减小 --bg_fuzz 到 8-12，减小 --bg_erode 到 1。

Q: 角色周围还有绿边残留？
A: 增大 --bg_fuzz 到 20-25，增大 --bg_erode 到 3-4。
```

快速参考卡片
```bash
# 最简命令（无去背景）
./run.sh

# 去绿幕（推荐）
./run.sh --remove_background true --bg_color "6FB16B" --bg_fuzz 15

# 去绿幕+去水印+去白边
./run.sh --remove_background true --remove_watermark true --remove_white_edge true

# 高质量
./run.sh --fps 20 --scale_size 512 --allow_rotation true --max_texture_size 4096 --remove_background false

# 快速原型
./run.sh --fps 5 --scale_size 128 --max_texture_size 1024 --remove_background false

# 完整流水线（豆包视频专用）
./run.sh --fps 10 --scale_size 126 --remove_background true --remove_watermark true --bg_color "6FB16B" --bg_fuzz 20 --bg_erode 2 --bg_crop_shave 25
```
