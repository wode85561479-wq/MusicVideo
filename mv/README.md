# 《尊贵的下一档》MV 源码

讽刺 OpenAI 十二月"ChatGPT + Codex 额度合并"、以及 Plus 与高档位会员差别对待的歌曲 MV。
画面风格：电脑桌面动画 × 伪 3D（CSS 3D）交叉。全片 3:38，43 个场景，字幕取自 Suno 导出音频里自带的歌词时间轴。

整套动画就是一个网页：每一帧都是时间 `t` 的纯函数（`window.renderAt(t)`），
用 Playwright 控制无头 Chromium 逐帧截图，再交给 ffmpeg 合成视频并混入原曲。

## 环境

- Node.js 18 及以上
- ffmpeg（需要在 PATH 里）
- Python 3（只在"浏览器实时播放"时用来起本地服务器，也可以换成任何静态服务器）

## 安装

```bash
cd mv
npm install
npx playwright install chromium
```

`assets/song.m4a` 是原曲，已经放在包里。如果换了音频，替换这个文件即可。

## 在浏览器里实时看

```bash
cd mv
npm run serve          # 相当于 python3 -m http.server 8000
```

然后打开 <http://localhost:8000/index.html?play>，点一下开始播放。
空格键暂停/继续，← → 快退/快进 5 秒。
（字体需要通过 http 加载，直接双击打开 html 文件会缺字体。）

## 渲染视频

```bash
npm run stills         # 渲染几张静帧到 stills/，用于快速检查
npm run render:1080p   # 1080p，4 核机器上约 17 分钟
npm run render:4k      # 4K（--dpr 2），4 核机器上约 1 小时
```

`render.js` 的常用参数：

| 参数 | 说明 |
|---|---|
| `--video out/xxx.mp4` | 输出文件 |
| `--audio assets/song.m4a` | 混入的音频 |
| `--dpr 1` / `--dpr 2` | 1 = 1920×1080，2 = 3840×2160 |
| `--workers 3` | 并行的浏览器数量，按 CPU 核数调 |
| `--chunk 8` | 每段多少秒 |
| `--from 0 --to 218.36` | 只渲染某个时间范围 |
| `--stills 1.5,20,46` | 不出视频，只截这几个时间点的 PNG |

渲染器会把视频分段存在 `out/<文件名>_seg_dpr1/seg_0000.mp4 …`，**已存在的分段会自动跳过**：
中途断了重跑同一条命令就能续上；改了某个场景后，只要删掉对应时间段的分段（第 n 段覆盖
`n×8` 到 `(n+1)×8` 秒），再跑一次就只重渲那几段，最后自动重新拼接。

## 目录结构

```
mv/
├── index.html        页面骨架 + 全部 CSS（窗口、字幕、各种组件样式）
├── lib.js            通用工具：缓动、额度酱表情、图标 SVG、壁纸主题、3D 盒子/硬币/地面/天空、窗口、贴纸……
├── intro.js          前奏 0–15.6 秒（显示器开机、叮咚弹窗、撕日历、礼盒、Plus/Pro 合并）
├── lyrics.js         歌词时间轴（从原曲内嵌字幕导出，改字幕就改这里）
├── main.js           场景调度、字幕动画、转场闪白、结尾关机效果、浏览器播放模式
├── sections/
│   ├── title.js      13.6–17.9   调研弹窗 + 标题卡（会员阶梯）
│   ├── verse1.js     17.8–45.7   主歌一 + 预副歌一
│   ├── chorus1.js    45.7–81.5   副歌一 + 后副歌
│   ├── verse2.js     81.5–108.5  主歌二 + 预副歌二
│   ├── chorus2.js   108.5–135.6  副歌二
│   ├── bridge.js    135.6–171.3  桥段 + 系统播报 + 低潮段
│   └── final.js     171.3–218.4  终副歌 + 尾声 + 片尾
├── render.js         分段并行渲染器
└── assets/song.m4a   原曲

preview/              最早确认风格用的 10 秒预览（独立可运行，结构更简单）
```

## 怎么改

- **改某一段画面**：在 `sections/` 里找对应时间的 `addScene(开始, 结束, …)`，
  里面 `return (t) => { … }` 就是每帧的动画逻辑。
- **改字幕文字或时间**：改 `lyrics.js`。字幕动画在 `main.js` 的 `renderCaps`。
- **改转场闪白**：各文件里的 `addFlash(开始, 峰值, 结束, 强度)`。
- **改全局配色/窗口样式**：`index.html` 里的 CSS 变量（`--pink`、`--mint`、`--ink`……）。
- **改额度酱表情**：`lib.js` 里的 `mascot()` 和 `MOOD`。

## 说明

- 片中出现的 ChatGPT、Codex、OpenAI 等名称仅用于讽刺评论；图标、额度酱、叮咚OS 等形象均为原创绘制。
- 字体来自 Fontsource（站酷快乐体、思源黑体、Press Start 2P、VT323），均为开源字体。
- 音乐由 Suno 生成。
