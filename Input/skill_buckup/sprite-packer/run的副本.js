#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, exec } = require('child_process');
const { packAsync } = require('free-tex-packer-core');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase().trim());
        });
    });
}

function parseArgs() {
    const args = process.argv.slice(2);
    const params = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                params[key] = value;
                i++;
            } else {
                params[key] = true;
            }
        }
    }
    return params;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function cleanDir(dir) {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            try {
                if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
            } catch(e) {}
        }
    }
}

function getVideoFiles(sourceDir) {
    const extensions = ['mp4', 'mov', 'avi', 'mkv'];
    const files = [];
    if (!fs.existsSync(sourceDir)) return files;
    const allFiles = fs.readdirSync(sourceDir);
    for (const file of allFiles) {
        const ext = path.extname(file).toLowerCase().slice(1);
        if (extensions.includes(ext)) {
            files.push({ name: file, path: path.join(sourceDir, file) });
        }
    }
    return files;
}

// ========== 命名模板配置 ==========
const TEMPLATES = {
    monster: {
        name: "怪物",
        template: "monster_{elements}_{level}_{action}_{frame}",
        variables: {
            elements: ["fire", "water", "earth", "wind", "thunder"],
            level: ["1", "2", "3", "4", "5"],
            action: ["idle", "attack", "run", "hurt", "die"]
        },
        description: "怪物命名: monster_[元素]_[等级]_[动作]_[帧序号]"
    },
    bullet: {
        name: "子弹",
        template: "bullet_{elements}_{level}_{frame}",
        variables: {
            elements: ["fire", "water", "earth", "wind", "thunder"],
            level: ["1", "2", "3", "4", "5"]
        },
        description: "子弹命名: bullet_[元素]_[等级]_[帧序号]"
    },
    tower: {
        name: "塔",
        template: "tower_{elements}_{level}_{frame}",
        variables: {
            elements: ["fire", "water", "earth", "wind", "thunder"],
            level: ["1", "2", "3", "4", "5"]
        },
        description: "塔命名: tower_[元素]_[等级]_[帧序号]"
    },
    effect: {
        name: "特效",
        template: "effect_{type}_{elements}_{frame}",
        variables: {
            type: ["explosion", "hit", "buff", "debuff", "heal"],
            elements: ["fire", "water", "earth", "wind", "thunder"]
        },
        description: "特效命名: effect_[类型]_[元素]_[帧序号]"
    },
    custom: {
        name: "自定义",
        template: "",
        variables: {},
        description: "自定义命名模板 (必须包含 {frame})"
    }
};

async function showNamingMenu() {
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("📝 请选择图片命名模板:");
    console.log("═══════════════════════════════════════════════════════════════");
    
    const templateKeys = Object.keys(TEMPLATES);
    for (let i = 0; i < templateKeys.length; i++) {
        const key = templateKeys[i];
        console.log(`  ${i + 1}. ${TEMPLATES[key].name} - ${TEMPLATES[key].description}`);
    }
    console.log("  s. 跳过（使用默认命名）");
    console.log("  q. 退出");
    console.log("═══════════════════════════════════════════════════════════════");
    
    while (true) {
        const answer = await askQuestion("请选择 (数字/s/q): ");
        if (answer === 'q') return null;
        if (answer === 's') return { skip: true };
        const num = parseInt(answer);
        if (!isNaN(num) && num >= 1 && num <= templateKeys.length) {
            const selectedKey = templateKeys[num - 1];
            const template = TEMPLATES[selectedKey];
            
            if (selectedKey === 'custom') {
                const customTemplate = await askQuestion("请输入自定义命名模板 (必须包含 {frame}): ");
                template.template = customTemplate;
            }
            
            return template;
        }
        console.log("请输入有效的数字、s(跳过)或q(退出)");
    }
}

async function selectVariableValues(template) {
    const values = {};
    
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("🎲 请为变量选择值:");
    console.log("═══════════════════════════════════════════════════════════════");
    
    for (const [varName, options] of Object.entries(template.variables)) {
        console.log(`\n变量: ${varName}`);
        for (let i = 0; i < options.length; i++) {
            console.log(`  ${i + 1}. ${options[i]}`);
        }
        console.log("  c. 自定义输入");
        
        while (true) {
            const answer = await askQuestion(`请选择 ${varName} 的值 (数字/c): `);
            if (answer === 'c') {
                const customValue = await askQuestion(`请输入 ${varName} 的自定义值: `);
                values[varName] = customValue;
                break;
            }
            const num = parseInt(answer);
            if (!isNaN(num) && num >= 1 && num <= options.length) {
                values[varName] = options[num - 1];
                break;
            }
            console.log("请输入有效的数字或 'c'");
        }
    }
    
    return values;
}

function generateFrameName(template, values, frameNumber) {
    let name = template;
    for (const [key, value] of Object.entries(values)) {
        name = name.replace(`{${key}}`, value);
    }
    name = name.replace(/{frame}/g, String(frameNumber).padStart(2, '0'));
    return name;
}

async function renameFrames(framesDir, namingConfig) {
    if (!namingConfig || namingConfig.skip || !namingConfig.template) return;
    
    const files = fs.readdirSync(framesDir).filter(f => f.match(/\.png$/i)).sort();
    
    for (let i = 0; i < files.length; i++) {
        const oldPath = path.join(framesDir, files[i]);
        const newName = generateFrameName(namingConfig.template, namingConfig.values, i + 1) + '.png';
        const newPath = path.join(framesDir, newName);
        fs.renameSync(oldPath, newPath);
        console.log(`  重命名: ${files[i]} → ${newName}`);
    }
}

async function showVideoMenu(videos) {
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("🎬 检测到以下视频文件:");
    for (let i = 0; i < videos.length; i++) {
        console.log(`  ${i + 1}. ${videos[i].name}`);
    }
    console.log("  a. 批量处理所有视频");
    console.log("  q. 退出");
    console.log("═══════════════════════════════════════════════════════════════");
    
    while (true) {
        const answer = await askQuestion("请选择 (数字/a/q): ");
        if (answer === 'q') return { type: 'exit' };
        if (answer === 'a') return { type: 'batch', videos: videos };
        const num = parseInt(answer);
        if (!isNaN(num) && num >= 1 && num <= videos.length) {
            return { type: 'single', video: videos[num - 1] };
        }
        console.log("请输入有效的数字、a(全部)或q(退出)");
    }
}

async function showActionMenu() {
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("📋 请选择要执行的功能:");
    console.log("  1. 抽帧 (视频 → frames)");
    console.log("  2. 裁剪+抠图+底部对齐 (frames → frames_removebg)");
    console.log("  3. 打包 (frames_removebg → ani_plist)");
    console.log("  4. 完整流程 (抽帧 → 裁剪+抠图+底部对齐 → 打包)");
    console.log("═══════════════════════════════════════════════════════════════");
    
    while (true) {
        const answer = await askQuestion("请选择 (1/2/3/4): ");
        if (answer === '1') return { action: 'extract_only' };
        if (answer === '2') return { action: 'crop_and_remove_bg' };
        if (answer === '3') return { action: 'pack_only' };
        if (answer === '4') return { action: 'full_process' };
        console.log("请输入 1、2、3 或 4");
    }
}

// ========== 核心功能函数 ==========

// FFmpeg 抽帧
function extractFrames(videoPath, outputDir, fps, maxFrames) {
    return new Promise((resolve, reject) => {
        const outputPattern = path.join(outputDir, 'frame_%04d.png');
        let cmd = `ffmpeg -i "${videoPath}" -vf "fps=${fps}" -qscale:v 2`;
        if (maxFrames > 0) cmd += ` -vframes ${maxFrames}`;
        cmd += ` "${outputPattern}" -y 2>/dev/null`;
        
        console.log(`抽帧中: ${path.basename(videoPath)} @ ${fps}fps`);
        
        exec(cmd, (error) => {
            if (error) {
                reject(new Error(`FFmpeg 抽帧失败: ${error.message}`));
            } else {
                const frames = fs.readdirSync(outputDir).filter(f => f.match(/\.png$/i)).length;
                resolve(frames);
            }
        });
    });
}

// 底部对齐函数 (从左下角开始检测)
function alignBottom(inputPath, outputPath, targetSize) {
    return new Promise((resolve, reject) => {
        // 使用 ImageMagick 的 trim + gravity south 来实现底部对齐
        // 先裁剪透明边，然后底部对齐到目标尺寸
        // gravity south 会把内容对齐到底部（从底部开始放置）
        const cmd = `convert "${inputPath}" -trim +repage -background none -gravity south -extent ${targetSize}x${targetSize} "${outputPath}"`;
        
        exec(cmd, (error) => {
            if (error) {
                console.log(`底部对齐失败: ${path.basename(inputPath)}`);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

// 裁剪 + 抠图 + 底部对齐
async function cropAndRemoveBg(inputDir, outputDir, targetSize) {
    ensureDir(outputDir);
    cleanDir(outputDir);
    
    const files = fs.readdirSync(inputDir).filter(f => f.match(/\.png$/i));
    if (files.length === 0) return 0;
    
    console.log(`处理图片: ${files.length} 张 (裁剪→抠图→底部对齐)`);
    
    for (let i = 0; i < files.length; i++) {
        const inputPath = path.join(inputDir, files[i]);
        const outputPath = path.join(outputDir, files[i]);
        const tempCrop = path.join(outputDir, `_temp_crop_${i}.png`);
        const tempBgRemoved = path.join(outputDir, `_temp_bg_${i}.png`);
        
        try {
            // 步骤1: 裁剪 (中心裁剪)
            execSync(`convert "${inputPath}" -resize ${targetSize}x${targetSize}^ -gravity center -extent ${targetSize}x${targetSize} "${tempCrop}"`);
            
            // 步骤2: 识别背景色
            const colorCmd = `convert "${tempCrop}" +dither -colors 8 -format "%c" histogram:info: | sort -rn | head -n 1 | grep -oE '#[0-9A-Fa-f]{6,8}' | head -1`;
            const bgColor = execSync(colorCmd).toString().trim();
            
            if (bgColor) {
                // 步骤3: 抠图 (去除背景，侵蚀扩大到2像素)
                execSync(`convert "${tempCrop}" -fuzz 15% -transparent "${bgColor}" -channel A -morphology Erode Diamond:2 -channel A -blur 1x0 -level 40%,100% -define png:format=png32 "${tempBgRemoved}"`);
            } else {
                execSync(`cp "${tempCrop}" "${tempBgRemoved}"`);
            }
            
            // 步骤4: 底部对齐 (从左下角开始)
            await alignBottom(tempBgRemoved, outputPath, targetSize);
            
            // 清理临时文件
            if (fs.existsSync(tempCrop)) fs.unlinkSync(tempCrop);
            if (fs.existsSync(tempBgRemoved)) fs.unlinkSync(tempBgRemoved);
            
        } catch(e) {
            console.log(`处理失败: ${files[i]}`);
            fs.copyFileSync(inputPath, outputPath);
        }
        
        if ((i + 1) % 10 === 0) {
            console.log(`进度: ${i + 1}/${files.length}`);
        }
    }
    
    console.log(`完成: ${files.length} 张`);
    return files.length;
}

// 打包精灵表 (自动计算最优尺寸)
async function packSprites(inputDir, outputDir, textureName) {
    ensureDir(outputDir);
    const images = [];
    const files = fs.readdirSync(inputDir);
    
    // 获取每张图片的实际尺寸
    for (const file of files) {
        if (file.match(/\.png$/i)) {
            const filePath = path.join(inputDir, file);
            const contents = fs.readFileSync(filePath);
            
            // 获取图片尺寸
            const sizeOutput = execSync(`identify -format "%wx%h" "${filePath}"`).toString().trim();
            const [w, h] = sizeOutput.split('x').map(Number);
            
            images.push({
                path: file,
                contents: contents,
                width: w,
                height: h
            });
        }
    }
    
    if (images.length === 0) throw new Error('没有找到图片文件');
    
    // 计算总面积和最大图片尺寸
    let totalArea = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    for (const img of images) {
        totalArea += img.width * img.height;
        maxWidth = Math.max(maxWidth, img.width);
        maxHeight = Math.max(maxHeight, img.height);
    }
    
    // 智能计算纹理尺寸 (自动识别图片大小，安排合理排列)
    let estimatedSize = Math.ceil(Math.sqrt(totalArea * 1.3));
    let textureSize = 256;
    while (textureSize < estimatedSize && textureSize < 4096) {
        textureSize *= 2;
    }
    // 确保纹理尺寸能放下最大的图片
    while (textureSize < maxWidth || textureSize < maxHeight) {
        textureSize *= 2;
    }
    textureSize = Math.min(textureSize, 4096);
    
    console.log(`图片分析: ${images.length} 张, 总面积 ${Math.round(totalArea / 1024)}KB, 最大图片 ${maxWidth}x${maxHeight}`);
    console.log(`自动计算纹理尺寸: ${textureSize}x${textureSize}`);
    
    const packOptions = {
        textureName: textureName,
        exporter: "Cocos2d",
        width: textureSize,
        height: textureSize,
        fixedSize: true,
        powerOfTwo: true,
        padding: 2,
        extrude: 2,
        allowRotation: false,
        allowTrim: true,
        packer: "MaxRectsBin",
        packerMethod: "BestShortSideFit",
        detectIdentical: true,
        removeFileExtension: true,
        textureFormat: "png"
    };
    
    console.log(`打包: ${images.length} 张 -> ${textureSize}x${textureSize}`);
    
    const files_out = await packAsync(images, packOptions);
    for (const file of files_out) {
        const outputPath = path.join(outputDir, file.name);
        fs.writeFileSync(outputPath, file.buffer);
        console.log(`生成: ${file.name} (${(file.buffer.length/1024).toFixed(1)} KB)`);
    }
    
    return files_out.map(f => f.name);
}

async function checkpointAfterExtract(framesDir, autoOpen) {
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("📸 确认点：抽帧完成");
    console.log(`📁 帧图片位置: ${framesDir}`);
    const frameCount = fs.readdirSync(framesDir).filter(f => f.match(/\.png$/i)).length;
    console.log(`📊 当前共有 ${frameCount} 帧`);
    console.log("\n💡 操作说明:");
    console.log("   1. 打开 Finder，前往上述目录");
    console.log("   2. 预览图片，删除不需要的帧");
    console.log("   3. 删除后，输入 'y' 继续");
    console.log("   4. 输入 'n' 退出");
    console.log("═══════════════════════════════════════════════════════════════");
    
    if (autoOpen) {
        exec(`open "${framesDir}"`);
        console.log("📂 已自动打开目录");
    }
    
    while (true) {
        const answer = await askQuestion("➡️  继续? (y/n): ");
        if (answer === 'y') {
            const remaining = fs.readdirSync(framesDir).filter(f => f.match(/\.png$/i)).length;
            if (remaining === 0) {
                console.log("⚠️ 没有剩余帧，无法继续");
                return false;
            }
            return true;
        } else if (answer === 'n') {
            return false;
        }
    }
}

// 打包前输入包名称
async function askTextureName() {
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("📦 请输入打包后的文件名（不需要扩展名）:");
    console.log("═══════════════════════════════════════════════════════════════");
    
    while (true) {
        const answer = await askQuestion("文件名: ");
        if (answer && answer.trim().length > 0) {
            return answer.trim();
        }
        console.log("文件名不能为空，请重新输入");
    }
}

// 清理临时目录（保留 ani_plist）
function cleanTempDirs(config) {
    const tempDirs = [config.frames_dir, config.removebg_dir];
    for (const dir of tempDirs) {
        if (fs.existsSync(dir)) {
            cleanDir(dir);
            console.log(`清理目录: ${dir}`);
        }
    }
}

// ========== 各功能主逻辑 ==========

// 功能1: 只抽帧
async function runExtractOnly(video, config, namingConfig) {
    console.log(`\n开始处理: ${video.name}`);
    
    // 清理临时目录
    cleanTempDirs(config);
    
    ensureDir(config.frames_dir);
    
    const frameCount = await extractFrames(video.path, config.frames_dir, config.fps, config.max_frames);
    console.log(`抽取 ${frameCount} 帧`);
    
    // 重命名帧图片
    await renameFrames(config.frames_dir, namingConfig);
    
    await checkpointAfterExtract(config.frames_dir, config.auto_open);
    
    // 归档视频
    const trashVideoDir = "/Volumes/OpenClaw/Animation/trushvideo";
    ensureDir(trashVideoDir);
    const destPath = path.join(trashVideoDir, `${Date.now()}_${video.name}`);
    fs.renameSync(video.path, destPath);
    
    console.log(`✅ 抽帧完成: ${video.name}`);
    return true;
}

// 功能2: 裁剪+抠图+底部对齐 (frames → frames_removebg)
async function runCropAndRemoveBg(config) {
    console.log(`\n开始裁剪+抠图+底部对齐: ${config.frames_dir} → ${config.removebg_dir}`);
    
    if (!fs.existsSync(config.frames_dir)) {
        console.log(`⚠️ 目录不存在: ${config.frames_dir}`);
        return false;
    }
    
    const files = fs.readdirSync(config.frames_dir).filter(f => f.match(/\.png$/i));
    if (files.length === 0) {
        console.log(`⚠️ 没有找到图片: ${config.frames_dir}`);
        return false;
    }
    
    const processedCount = await cropAndRemoveBg(config.frames_dir, config.removebg_dir, config.scale_size);
    
    console.log(`✅ 完成: ${processedCount} 张图片 -> ${config.removebg_dir}`);
    return true;
}

// 功能3: 只打包 (frames_removebg → ani_plist)
async function runPackOnly(config) {
    console.log(`\n开始打包: ${config.removebg_dir} → ${config.output_dir}`);
    
    if (!fs.existsSync(config.removebg_dir)) {
        console.log(`⚠️ 目录不存在: ${config.removebg_dir}`);
        return false;
    }
    
    const files = fs.readdirSync(config.removebg_dir).filter(f => f.match(/\.png$/i));
    if (files.length === 0) {
        console.log(`⚠️ 没有找到图片: ${config.removebg_dir}`);
        return false;
    }
    
    console.log(`找到 ${files.length} 张图片`);
    
    const textureName = await askTextureName();
    const packFiles = await packSprites(config.removebg_dir, config.output_dir, textureName);
    console.log(`✅ 完成: 生成 ${packFiles.join(', ')}`);
    
    return true;
}

// 功能4: 完整流程 (抽帧 → 裁剪+抠图+底部对齐 → 打包)
async function runFullProcess(video, config, namingConfig) {
    console.log(`\n开始处理: ${video.name}`);
    
    // 清理临时目录
    cleanTempDirs(config);
    
    // 1. 抽帧
    ensureDir(config.frames_dir);
    const frameCount = await extractFrames(video.path, config.frames_dir, config.fps, config.max_frames);
    console.log(`抽取 ${frameCount} 帧`);
    
    // 重命名帧图片
    await renameFrames(config.frames_dir, namingConfig);
    
    const shouldContinue = await checkpointAfterExtract(config.frames_dir, config.auto_open);
    if (!shouldContinue) return false;
    
    // 2. 裁剪+抠图+底部对齐
    const processedCount = await cropAndRemoveBg(config.frames_dir, config.removebg_dir, config.scale_size);
    
    // 3. 打包
    if (processedCount > 0) {
        const textureName = await askTextureName();
        const packFiles = await packSprites(config.removebg_dir, config.output_dir, textureName);
        console.log(`✅ 完成: ${video.name} -> ${packFiles.join(', ')}`);
    } else {
        console.log(`⚠️ 没有可打包的图片: ${video.name}`);
    }
    
    // 4. 归档视频
    const trashVideoDir = "/Volumes/OpenClaw/Animation/trushvideo";
    ensureDir(trashVideoDir);
    const destPath = path.join(trashVideoDir, `${Date.now()}_${video.name}`);
    fs.renameSync(video.path, destPath);
    
    console.log(`✅ 完整流程完成: ${video.name}`);
    return true;
}

async function main() {
    const params = parseArgs();
    
    const config = {
        frames_dir: "/Volumes/OpenClaw/Animation/frames",
        removebg_dir: "/Volumes/OpenClaw/Animation/frames_removebg",
        output_dir: "/Volumes/OpenClaw/Animation/ani_plist",
        fps: parseInt(params.fps) || 1,
        max_frames: parseInt(params.max_frames) || 4,
        scale_size: parseInt(params.scale_size) || 128,
        auto_open: params.auto_open === 'true'
    };
    
    console.log("开始处理", config);
    
    const action = await showActionMenu();
    
    let namingConfig = null;
    if (action.action === 'extract_only' || action.action === 'full_process') {
        const template = await showNamingMenu();
        if (template === null) {
            console.log("退出");
            rl.close();
            process.exit(0);
        }
        if (!template.skip) {
            const values = await selectVariableValues(template);
            namingConfig = {
                template: template.template,
                values: values,
                skip: false
            };
            console.log("\n命名配置:");
            console.log(`  模板: ${namingConfig.template}`);
            console.log(`  变量: ${JSON.stringify(namingConfig.values)}`);
        } else {
            namingConfig = { skip: true };
            console.log("跳过命名，使用默认文件名");
        }
    }
    
    if (action.action === 'crop_and_remove_bg') {
        await runCropAndRemoveBg(config);
        rl.close();
        return;
    }
    
    if (action.action === 'pack_only') {
        await runPackOnly(config);
        rl.close();
        return;
    }
    
    const videos = getVideoFiles("/Volumes/OpenClaw/Animation/source_Ani");
    if (videos.length === 0) {
        console.log("没有找到视频文件");
        rl.close();
        process.exit(1);
    }
    
    const videoChoice = await showVideoMenu(videos);
    if (videoChoice.type === 'exit') {
        console.log("退出");
        rl.close();
        process.exit(0);
    }
    
    if (videoChoice.type === 'batch') {
        for (const video of videoChoice.videos) {
            if (action.action === 'extract_only') {
                await runExtractOnly(video, config, namingConfig);
            } else if (action.action === 'full_process') {
                await runFullProcess(video, config, namingConfig);
            }
        }
    } else {
        if (action.action === 'extract_only') {
            await runExtractOnly(videoChoice.video, config, namingConfig);
        } else if (action.action === 'full_process') {
            await runFullProcess(videoChoice.video, config, namingConfig);
        }
    }
    
    console.log("\n全部完成！");
    rl.close();
}

main();
