# MusicVideo · 初音未来 × 书记舞（同人动画）

用 [Remotion](https://www.remotion.dev/) 纯代码制作的 30 秒赛璐璐风格动画：初音未来跳一段以《辉夜大小姐想让我告白》
藤原书记 ED 舞蹈为灵感的舞蹈。成片在 [`out/miku-chika-dance.mp4`](out/miku-chika-dance.mp4)（1920×1080，30fps，128 BPM）。

> 非官方、非商业的同人作品。角色造型为手写 SVG 原创绘制，配乐为脚本合成的原创曲，
> 没有使用原作的任何画面、音频或旋律。舞蹈是手工打关键帧的"致敬版"，不是逐帧复刻。

## 运行

```bash
npm install
npm run music    # 合成配乐 -> public/music.wav
npm run studio   # 打开 Remotion Studio 实时预览
npm run render   # 渲染 -> out/miku-chika-dance.mp4
```

`remotion.config.ts` 会优先使用本机已有的 headless Chromium（可用 `REMOTION_BROWSER` 指定路径），
找不到时 Remotion 会自行下载。

## 结构

| 路径 | 内容 |
| --- | --- |
| `src/rig/` | 2D 骨骼：姿态定义、带"保持"的 pose-to-pose 插值、手脚 IK 求解 |
| `src/dance/choreo.ts` | 编舞关键帧（按拍子写）、旋转轨道、眨眼/口型、分镜与机位 |
| `src/character/` | 角色绘制：头部与表情、双马尾跟随、四肢、服装、手型 |
| `src/stage/` | 舞台背景、地板倒影、星星/爱心粒子、集中线 |
| `src/Scene.tsx` | 合成：机位、背景视差、特效、标题、音频 |
| `scripts/make-music.mjs` | 配乐合成器（鼓、贝斯、琶音、主旋律，按编舞加重音） |

## 舞蹈段落（每段 8 拍）

| 拍 | 动作 |
| --- | --- |
| 0–8 | 从天而降落地 → 叉腰挥手亮相 |
| 8–16 | 叉腰左右顶胯 → 双臂同侧摆动 |
| 16–24 | 双手贴脸"chika chika"抖手 + 侧并步 → 迪斯科指天指地 |
| 24–32 | 胸前绕拳下蹲再起 → 跳跃 → 左右上方拍手 |
| 32–40 | 原地踏步摆臂 → 转圈 → 剪刀手 wink 特写 |
| 40–48 | 双手举高左右挥 → 猫爪歪头 |
| 48–56 | 胸前比心并送出 → 蓄力 → 两圈旋转 |
| 56–64 | 指天定格 wink → 双剪刀手收尾 |

## 调整

- 改动作：编辑 `src/dance/choreo.ts` 里的 `k(拍, 姿态, 过渡拍数, 缓动)`；手的位置相对胸口、脚相对地面，单位是像素、y 向上。
- 改机位/配色：同文件底部的 `shots`，以及 `src/stage/Background.tsx` 的 `PALETTES`。
- 改速度：`BPM` 同时出现在 `src/dance/choreo.ts` 和 `scripts/make-music.mjs`，两处要一起改。
