# 勿听 · 水墨电影化动画 MV

《黑神话：悟空》歌曲《勿听》的全曲动画 MV（257.69s，1920×1080，2.39:1 宽银幕，24fps）。

## 成片与交付物

| 交付物 | 位置 |
|---|---|
| 完整 MV（母版） | `exports/勿听_MV_1080p.mp4`（266MB，超出 GitHub 单文件 100MB 限制，不入 git） |
| 完整 MV（预览版） | `exports/勿听_MV_720p_预览.mp4`（26MB，已入 git） |
| 逐镜视频片段（38 个） | `video_clips/SH01.mp4` … `SH38.mp4`（不入 git） |
| 分镜表（含时间码） | `storyboard/分镜表.md`、`storyboard/timeline.json`、`storyboard/分镜缩略图.jpg` |
| 逐镜图生视频提示词 | `storyboard/图生视频提示词.md` |
| 视觉总纲 / 角色 / 场景规范 | `art_direction/` |
| 关键帧 | `keyframes/WUTING_SCxx_SHxxx_KEYFRAME_V001.jpg` |
| 角色与场景资产 | `compositing/sprites/`、`compositing/plates/`（不入 git，可由脚本重建） |
| 剪辑工程 | `edit/勿听_MV.edl`（CMX3600，可导入 Premiere / Resolve）、`edit/concat_list.txt`、`engine/render.py` |
| 音频分析 | `reports/audio_analysis.json`、`reports/audio_analysis.png`、`reports/audio_foreground_spectrogram.png` |
| 质检与问题清单 | `reports/未解决问题清单.md`、`reports/QC_逐镜检查.json`、`reports/qc/转场中点.jpg`、`reports/制作记录.md` |

## 重建流程

```bash
python3 engine/audio_analysis.py      # 音频分析（约 2 分钟）
python3 engine/prep_assets.py all     # 超分、深度、分层、角色抠图（需要 models/ 下的 ONNX 与 .pth）
python3 engine/build_storyboard.py    # 由 engine/storyboard_data.py 生成时间轴与分镜文档
python3 engine/render.py              # 渲染全部镜头并合成音频（4 进程约 40 分钟）
python3 engine/finalize.py            # 逐镜质检、关键帧、EDL、缩略图
python3 engine/preview.py SH08 7.11 0.5 3.5 7.0   # 单镜静帧预览
```

模型（放在 `models/`，均来自 GitHub Release）：`depth_anything_v2_vits.onnx`、`isnet-anime.onnx`、`u2net.onnx`、`realesr-animevideov3.pth`。

## 引擎结构（`engine/`）

- `core.py`：2.5D 针孔相机（每层深度 Z，平移视差 + 推轨放大 + pan/roll/shake）、噪声、宣纸纹理、墨纸双色调调色、敦煌矿物色与青绿山水映射。
- `elements.py`：场景分层堆栈（含水墨笔序显影）、角色木偶（布料/发丝/呼吸形变、飞白边、轮廓光、倒影、墨化显隐）、雾、粒子、花瓣、群鸦、符纸、蛛丝与蛛网、墨滴晕染、程序化水墨山峦、月（含烘云托月）、涟漪、呼气与香烟、敦煌岩壁与壁画化、剥落、化为墨尘。
- `transitions.py`：墨迹扩散、山雾、蛛丝划过、水波、墨黑、壁画剥落、淡化、硬切。
- `shots.py`：38 个镜头的定义。
- `models.py`：本地 CPU 推理（Depth Anything、ISNet、U2Net，以及无 PyTorch 运行的 Real-ESRGAN）。
