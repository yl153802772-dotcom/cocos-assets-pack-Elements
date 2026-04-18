元素球 ≠ 怪物
命名更简单，结构更轻（偏UI/组件体）
🎯 一、命名方式（最终版）
✅ 推荐
orb_{element}_{level}
示例
orb_fire_1
orb_fire_2
orb_fire_3

orb_water_1
orb_earth_2
orb_wind_3
❗不要用
❌ tier（没必要）
❌ action（没有动画阶段）
🎯 二、图集
atlas_orb_common.plist

👉 所有元素球放一起（数量少）

🎯 三、预制体结构（关键）
✅ 一个通用Prefab
Orb.prefab
结构
Orb
├── Core（Sprite）
├── Glow（Sprite，可选）
├── Particle（可选）
❗没有这些
❌ Trail（不要拖尾）
❌ 复杂动画结构
🎯 四、功能适配（你这个项目重点）

元素球有3种行为👇

1️⃣ 展示（UI/待机）
轻微呼吸 + 发光
   


Core（主体）
96 x 96
✅ Glow（发光）
128 x 128
✅ Particle（粒子）
32 x 32（或 64 x 64）

Prefab逻辑尺寸（合成区）
128 x 128

👉 注意：

球 ≠ 子弹
球只是“数据载体 + 表现”


和怪物的核心区别
项目	怪物	元素球
命名	monster_xxx	orb_xxx
动画	帧动画	基本没有
结构	Body + Effect	Core + Glow
行为	移动/战斗	UI/拖拽/合成
复杂度	高	低