"""Build storyboard/timeline.json, storyboard/分镜表.md and storyboard/图生视频提示词.md from storyboard_data.py.
Cut times are snapped to the nearest detected beat when one lies within 0.25 s."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import storyboard_data as S  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def tc(t):
    m, s = divmod(t, 60)
    return f"{int(m):02d}:{s:05.2f}"


def main():
    audio = json.loads((ROOT / "reports" / "audio_analysis.json").read_text())
    beats = audio["beats"]
    shots = []
    for i, sh in enumerate(S.SHOTS):
        t = sh["t"]
        if i > 0:
            nb = min(beats, key=lambda b: abs(b - t))
            if abs(nb - t) <= 0.25:
                t = nb
        shots.append(dict(sh, start=round(t, 3)))
    for i, sh in enumerate(shots):
        sh["end"] = shots[i + 1]["start"] if i + 1 < len(shots) else S.SONG_END
        sh["dur"] = round(sh["end"] - sh["start"], 3)
    # sanity: contiguous, covers the song
    assert shots[0]["start"] == 0.0 and abs(shots[-1]["end"] - S.SONG_END) < 1e-6
    for a, b in zip(shots[:-1], shots[1:]):
        assert a["end"] == b["start"] and a["dur"] > 2.0, (a["id"], a["dur"])

    out = ROOT / "storyboard"
    out.mkdir(exist_ok=True)
    timeline = [dict(id=s["id"], start=s["start"], end=s["end"], dur=s["dur"], title=s["title"],
                     trans=dict(type=s["trans"][0], dur=s["trans"][1])) for s in shots]
    (out / "timeline.json").write_text(json.dumps(dict(song_end=S.SONG_END, fps=24, shots=timeline),
                                                  ensure_ascii=False, indent=1))

    md = ["# 《勿听》全曲分镜表", "",
          f"音频：`audio/wuting_master.mp3`，时长 {S.SONG_END:.3f}s（{tc(S.SONG_END)}）。镜头数 {len(shots)}，"
          f"平均镜头长 {S.SONG_END / len(shots):.2f}s。剪辑点已吸附到检测到的节拍（±0.25s 内）。", "",
          "音乐段落为音频分析的估计值（见 `reports/audio_analysis.json` 与 `reports/audio_analysis.png`），未经人耳逐句核对；"
          "未使用歌词——当前环境中没有可核对的歌词文本，不编造。", "",
          "| 镜头 | 时间码 | 时长 | 阶段 | 标题 | 场景 | 人物 | 景别 | 摄影机 | 设计动作 | 水墨/色彩 | 入场转场 | 音乐 | 实际实现 |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for s in shots:
        tr = s["trans"][0] + (f" {s['trans'][1]}s" if s["trans"][1] else "")
        md.append(f"| {s['id']} | {tc(s['start'])}–{tc(s['end'])} | {s['dur']:.2f}s | {s['stage']} | {s['title']} | {s['scene']} | "
                  f"{s['chars']} | {s['size']} | {s['camera']} | {s['action']} | {s['ink']}；{s['color']} | {tr} | {s['music']} | {s['impl']} |")
    (out / "分镜表.md").write_text("\n".join(md) + "\n")

    pm = ["# 《勿听》逐镜图生视频提示词", "",
          "用途：若之后获得可用的图生视频模型（如可灵、Runway、Wan 等），可用 `keyframes/` 中对应镜头的关键帧作为首帧，"
          "配合下列提示词重新生成该镜头。每条提示词已包含统一美术规范与排除项，可直接复制使用。", ""]
    for s in shots:
        pm += [f"## {s['id']} {s['title']}（{tc(s['start'])}–{tc(s['end'])}，{s['dur']:.2f}s）", "",
               f"- 【角色与主体】{s['prompt_subject']}",
               f"- 【场景】{s['scene']}；{s['stage']}",
               f"- 【美术】{S.STYLE}；本镜色彩：{s['color']}",
               f"- 【摄影机】{s['size']}；{s['camera']}；结束构图：{s['prompt_end']}",
               f"- 【动作】{s['prompt_action']}",
               f"- 【光影与色彩】{s['color']}；水墨动态：{s['ink']}",
               "- 【连续性约束】角色外观与角色规范一致，动作连续，空间方向不突变，不出现无依据的物体或人物",
               f"- 【排除项】{S.NEGATIVE}", ""]
    (out / "图生视频提示词.md").write_text("\n".join(pm))
    print(f"{len(shots)} shots, total {sum(s['dur'] for s in shots):.3f}s")
    for s in shots:
        print(s["id"], tc(s["start"]), f"{s['dur']:.2f}", s["trans"][0], s["title"])


if __name__ == "__main__":
    main()
