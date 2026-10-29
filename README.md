# MusicVideo · 水墨动画 MV

一部程序生成的国画／水墨风格动画，配一首为它原创的古风器乐曲。所有画面（宣纸、远山、松、竹、梅、孤舟、仙鹤、题款与印章）都用代码以"笔触 + 墨色浓度"绘制；配乐按场景逐段谱写，画面再跟随乐曲的节拍、重音和响度运动。

## 分镜与配乐

| 时间 | 场景 | 配乐 |
| --- | --- | --- |
| 0:00 | 远山初现：一滴墨落纸晕开，远山从墨晕中浮现 | 水滴声开篇，箫（E 羽调）在持续音上缓缓吹出主题，古筝渐入 |
| 0:40 | 江上孤舟：渔翁垂钓，芦苇摇曳，倒影与涟漪 | 古筝流水般的分解和弦，笛子歌唱，大提琴托底 |
| 1:13 | 竹林：前中后三层竹子视差移动 | 扬琴十六分音符、木鱼、拨弦，笛子轻快的旋律 |
| 1:43 | 梅·群峰（副歌）：一笔飞白横扫入场，梅枝生长 | 定音鼓滚奏与古筝刮奏迎来太鼓重击，笛与小提琴唱出主题（G 宫调） |
| 2:25 | 月夜（桥段）：烘云托月、柳枝、月影 | 速度放慢，箫独奏、柔和的长音与零星泛音 |
| 2:45 | 鹤舞万山（高潮）：朱日、云海、鹤群、落英 | 锣声开场，主题升高全音（A 宫调），合唱、弦乐与太鼓全奏 |
| 3:34 | 终章：画面隐入云雾，题写"山水有清音"并钤印"清音" | 每写一字，古筝按揉一音；钤印时一声轻锣，余音渐散 |

每段乐曲的小节数与场景时长严格对齐；鸟与鹤按拍振翅，涟漪、落叶、花瓣、梅花绽放落在重音上。场景之间用"墨染"转场（新画面像湿墨在宣纸上洇开）。

## 生成

依赖：Python 3、numpy、scipy、Pillow、librosa、mido、pyloudnorm、ffmpeg、FluidSynth 与 FluidR3 GM 音色库（`apt install fluidsynth fluid-soundfont-gm`）。

```bash
# 1. 谱曲、逐轨渲染、混音 -> build/music.wav、music.m4a 与节拍数据 build/analysis.json
python3 src/compose.py

# 2. 预览单帧（秒）
python3 src/render.py --still 5,45,110,150,190,225

# 3. 渲染完整视频（1920x1080, 30fps，多进程）
python3 src/render.py --audio build/music.m4a --out build/ink_mv.mp4
```

若想给画面换一首现成的曲子，可用 `src/analyze.py` 从音频提取节拍数据代替第 1 步（场景切换时间写在 `src/inkmv/scenes.py` 顶部）。

## 代码结构

- `src/compose.py` 原创配乐：乐谱、FluidSynth 渲染、音效合成（水滴、锣、风、镲片渐强）、混响与母带
- `src/analyze.py` 从任意音频提取节拍、重音与响度
- `src/inkmv/core.py` 噪声、宣纸、毛笔笔触（含飞白）、墨色合成（Beer-Lambert 吸收模型）
- `src/inkmv/mountains.py` 层叠山峦、披麻皴、苔点、云雾
- `src/inkmv/elements.py` 松、竹、梅、孤舟、芦苇、柳、飞鸟、仙鹤、花瓣、印章、书法
- `src/inkmv/effects.py` 墨晕、墨染转场、涟漪、飘落粒子、鸟群、视差图层
- `src/inkmv/scenes.py` 六个场景
- `src/inkmv/timeline.py` 场景编排与转场
- `src/render.py` 渲染入口

字体：马善政楷书、智莽行书（Google Fonts，SIL OFL 1.1，见 `assets/fonts/OFL.txt`）。
