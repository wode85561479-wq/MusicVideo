# MusicVideo · 水墨动画 MV

一首歌配一部程序生成的国画／水墨风格动画。所有画面（宣纸、远山、松、竹、梅、孤舟、仙鹤、题款与印章）都用代码以"笔触 + 墨色浓度"绘制，并按音乐的节拍、段落和响度驱动。

## 分镜（按歌曲段落）

| 时间 | 场景 | 与音乐的对应 |
| --- | --- | --- |
| 0:00 | 远山初现：一滴墨落纸晕开，远山从墨晕中浮现 | 前奏渐强时中景山、松崖、飞鸟依次出现 |
| 0:40 | 江上孤舟：渔翁垂钓，芦苇摇曳，倒影与涟漪 | 每个重拍在钓线处荡开涟漪 |
| 1:13 | 竹林：前中后三层竹子视差移动 | 竹叶随响度摆动，重拍时落叶 |
| 1:43 | 梅·群峰（副歌）：一笔飞白横扫入场，梅枝生长 | 梅花按节拍逐朵绽放，花瓣随拍飘落 |
| 2:25 | 月夜（桥段）：烘云托月、柳枝、月影 | 仙鹤掠过明月，月影随拍闪动 |
| 2:45 | 鹤舞万山（高潮）：朱日、云海、鹤群、落英 | 鹤每两拍振翅一次，重拍时花瓣成阵 |
| 3:34 | 终章：画面隐入云雾，题写"山水有清音"并钤印"清音" | 每个小节写一字，最后淡出 |

场景之间用"墨染"转场（新画面像湿墨在宣纸上洇开）。

## 生成

依赖：Python 3、numpy、scipy、Pillow、librosa、ffmpeg。

```bash
# 1. 分析音频：节拍、重音、响度、段落 -> build/analysis.json
ffmpeg -i song.m4a -ac 1 -ar 22050 build/song_mono.wav
python3 src/analyze.py build/song_mono.wav build/analysis.json

# 2. 预览单帧（秒）
python3 src/render.py --still 5,45,110,150,190,225

# 3. 渲染完整视频（1920x1080, 30fps，多进程）
python3 src/render.py --audio song.m4a --out build/ink_mv.mp4
```

## 代码结构

- `src/analyze.py` 音频分析
- `src/inkmv/core.py` 噪声、宣纸、毛笔笔触（含飞白）、墨色合成（Beer-Lambert 吸收模型）
- `src/inkmv/mountains.py` 层叠山峦、披麻皴、苔点、云雾
- `src/inkmv/elements.py` 松、竹、梅、孤舟、芦苇、柳、飞鸟、仙鹤、花瓣、印章、书法
- `src/inkmv/effects.py` 墨晕、墨染转场、涟漪、飘落粒子、鸟群、视差图层
- `src/inkmv/scenes.py` 六个场景
- `src/inkmv/timeline.py` 场景编排与转场
- `src/render.py` 渲染入口

字体：马善政楷书、智莽行书（Google Fonts，SIL OFL 1.1，见 `assets/fonts/OFL.txt`）。
