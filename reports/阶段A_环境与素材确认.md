# 阶段 A：环境与素材确认

检查日期：2026-10-27。以下全部为实测结果。

## 1. 素材状态

| 素材 | 文件 | 规格 | 状态 |
|---|---|---|---|
| 正式音频《勿听》 | `audio/wuting_master.mp3`（解码副本 `audio/wuting_master.wav`） | MP3 320kbps，48kHz 立体声，257.685s；元数据：专辑《黑神话：悟空》游戏音乐，B 站转封装 | 完整，全程解码无错误 |
| 场景 1 雪夜城 | `references/REF_SC01_snow_castle_night.png` | 2266×1488 | 可用 |
| 场景 2 红日山门 | `references/REF_SC02_temple_gate_red_sun.jpg` | 2266×1177 | 可用 |
| 场景 3 六格分镜 | `references/REF_SC03_six_panel_storyboard.jpg` | 2576×1438（每格约 1288×479） | 可用，单格分辨率低，已超分 |
| 猪八戒原形 | `references/REF_CH01_bajie_boar_portrait.jpg` | 1365×1488，写实三维胸像 | 可用，仅有胸像，无全身 |
| 猪八戒人形（天蓬元帅） | `references/REF_CH02_tianpeng_human_sheet.png` | 1536×1024，含正/侧/背/特写/武器/动作 | 可用 |
| 紫蛛儿 | `references/REF_CH03_zizhuer_sheet.jpg` | 2576×1438，含正/侧/背/三分之二侧/特写/动作 | 可用 |
| 歌词文本 | — | — | **未提供**。本项目不使用、不编造歌词与逐句时间码 |

## 2. 硬件与软件

| 项目 | 实测 |
|---|---|
| GPU | **无**（无 nvidia-smi，无 CUDA） |
| CPU / 内存 / 磁盘 | 4 核 / 15 GB / 约 30 GB 可用 |
| 视频 | ffmpeg（libx264、libx265、aac） |
| Python | 3.13；numpy、Pillow 预装；已安装 scipy、opencv-python-headless、librosa、onnxruntime、onnx、matplotlib、soundfile |
| 网络 | PyPI、GitHub Release 可达；**HuggingFace、download.pytorch.org、raw.githubusercontent.com 被代理拒绝** |
| AI 生成服务 | 环境中**没有**任何图像/视频生成服务的 API 密钥（可灵、Runway、Pika、Luma、Replicate、fal、OpenAI 等均无） |

## 3. 实际可用的模型（全部本地 CPU 推理，免费开源）

| 模型 | 用途 | 来源 |
|---|---|---|
| Depth Anything V2 Small（ONNX） | 场景深度估计 → 纵深分层与视差 | GitHub Release |
| ISNet-anime、U2Net（ONNX，rembg 发布） | 角色抠图 | GitHub Release |
| Real-ESRGAN animevideov3 | 4 倍超分（场景与角色） | GitHub Release 的 .pth；因无法安装 PyTorch，我解析了 .pth 并把 SRVGGNetCompact 重建为 ONNX 运行 |

## 4. 能力边界（如实说明）

1. **无法进行 AI 图生视频**。图生视频模型需要 GPU 或付费 API，两者都没有；HuggingFace 被拦截，也无法下载开源视频模型权重。在 4 核 CPU 上运行视频扩散模型也不现实。
2. 因此采用的工作流是：**以参考图为关键画面，用自研的 2.5D 合成引擎制作真实运动**——深度分层视差相机（推、拉、横移、摇、升降）、程序化水墨（墨滴晕染、山峦生长、笔序显影、墨迹扩散转场）、雾/雪/花瓣/墨尘/群鸦粒子、蛛丝与蛛网物理摆动及断裂、角色木偶的布料/发丝/呼吸形变、水面倒影与涟漪、色彩扩散与壁画剥落。
3. 这种方式的局限：**角色没有真正的表演动画**（不会走路迈腿、不会说话、表情不变化）。角色动作限于整体位移、步伐起伏、衣摆发丝随风、呼吸、轻微转头倾斜、墨化显现/消散，以及在姿态之间用水墨方式转场。
4. 没有调用任何付费服务，没有消耗额度。
5. 每个镜头都附了可直接使用的图生视频提示词（`storyboard/图生视频提示词.md`）。日后获得可用的视频模型时，可以用 `keyframes/` 里的关键帧作首帧，逐镜替换成生成式视频。
