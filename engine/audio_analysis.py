"""Audio analysis for 勿听 MV: energy, beats, structural segmentation, vocal-activity estimate.

Outputs:
  reports/audio_analysis.json   machine-readable timeline used by the storyboard / renderer
  reports/audio_analysis.png    visual overview chart
"""
import json
import sys
from pathlib import Path

import numpy as np
import librosa
import scipy.ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
WAV = ROOT / "audio" / "wuting_master.wav"
SR = 22050
HOP = 512


def smooth(x, sec):
    w = max(1, int(sec * SR / HOP))
    return ndi.uniform_filter1d(x, w)


def main():
    y, sr = librosa.load(WAV, sr=SR, mono=True)
    dur = len(y) / sr
    t_frames = lambda n: librosa.frames_to_time(np.arange(n), sr=sr, hop_length=HOP)

    # --- loudness envelope
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    rms_db = librosa.amplitude_to_db(rms, ref=np.max)
    loud = smooth(rms_db, 2.0)

    # --- spectral descriptors
    S = np.abs(librosa.stft(y, hop_length=HOP))
    centroid = librosa.feature.spectral_centroid(S=S, sr=sr)[0]
    onset_env = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S), sr=sr, hop_length=HOP)

    # --- tempo / beats
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=HOP)
    beat_times = librosa.frames_to_time(beats, sr=sr, hop_length=HOP)
    tempo = float(np.atleast_1d(tempo)[0])

    # --- vocal activity via REPET-SIM (librosa nearest-neighbour filtering)
    S_full, phase = librosa.magphase(librosa.stft(y, hop_length=HOP))
    S_filter = librosa.decompose.nn_filter(S_full, aggregate=np.median, metric="cosine",
                                           width=int(librosa.time_to_frames(2, sr=sr, hop_length=HOP)))
    S_filter = np.minimum(S_full, S_filter)
    margin_v = 10
    mask_v = librosa.util.softmask(S_full - S_filter, margin_v * S_filter, power=2)
    S_fg = mask_v * S_full
    freqs = librosa.fft_frequencies(sr=sr)
    band = (freqs > 250) & (freqs < 3500)
    voc_energy = S_fg[band].sum(axis=0) / (S_full[band].sum(axis=0) + 1e-9)
    voc = smooth(voc_energy, 1.0)
    voc_n = (voc - np.percentile(voc, 10)) / (np.percentile(voc, 95) - np.percentile(voc, 10) + 1e-9)
    voc_n = np.clip(voc_n, 0, 1)
    # hysteresis threshold -> vocal regions
    on, off = 0.45, 0.30
    active, regions, start = False, [], 0
    times = t_frames(len(voc_n))
    for i, v in enumerate(voc_n):
        if not active and v > on:
            active, start = True, times[i]
        elif active and v < off:
            active = False
            if times[i] - start > 1.5:
                regions.append([round(float(start), 2), round(float(times[i]), 2)])
    if active:
        regions.append([round(float(start), 2), round(float(times[-1]), 2)])
    # merge regions separated by < 1.2 s (breaths)
    merged = []
    for r in regions:
        if merged and r[0] - merged[-1][1] < 1.2:
            merged[-1][1] = r[1]
        else:
            merged.append(r)

    # --- structural segmentation: novelty on beat-synchronous chroma + MFCC
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=HOP)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=HOP)
    feat = np.vstack([librosa.util.normalize(chroma, axis=0), librosa.util.normalize(mfcc[1:], axis=1)])
    # pool to 0.5 s frames
    pool = int(0.5 * sr / HOP)
    n = feat.shape[1] // pool
    F = feat[:, : n * pool].reshape(feat.shape[0], n, pool).mean(axis=2)
    F = F / (np.linalg.norm(F, axis=0, keepdims=True) + 1e-9)
    SSM = F.T @ F
    k = 16  # 8 s checkerboard kernel half-width (in 0.5 s units)
    g = np.outer(np.r_[-np.ones(k), np.ones(k)], np.r_[-np.ones(k), np.ones(k)])
    win = np.outer(np.hanning(2 * k), np.hanning(2 * k))
    ker = g * win
    pad = np.pad(SSM, k, mode="edge")
    nov = np.array([(pad[i:i + 2 * k, i:i + 2 * k] * ker).sum() for i in range(n)])
    nov = np.maximum(nov, 0)
    nov /= nov.max() + 1e-9
    peaks = librosa.util.peak_pick(nov, pre_max=12, post_max=12, pre_avg=12, post_avg=12, delta=0.05, wait=16)
    bounds = sorted(set([0.0] + [round(float(p * 0.5), 2) for p in peaks if 4 < p * 0.5 < dur - 4] + [round(dur, 2)]))

    # per-segment descriptors
    segs = []
    for a, b in zip(bounds[:-1], bounds[1:]):
        fa, fb = librosa.time_to_frames([a, b], sr=sr, hop_length=HOP)
        fb = max(fb, fa + 1)
        vocal_frac = float(np.mean(voc_n[fa:fb] > on))
        segs.append({
            "start": a, "end": b, "dur": round(b - a, 2),
            "loudness_db": round(float(np.mean(rms_db[fa:fb])), 2),
            "brightness_hz": round(float(np.mean(centroid[fa:fb])), 1),
            "onset_density": round(float(np.mean(onset_env[fa:fb])), 3),
            "vocal_fraction": round(vocal_frac, 2),
        })

    # loudness peaks (emotional peaks) and dips (quiet holds), 1 s resolution
    sec_db = np.array([np.mean(rms_db[int(librosa.time_to_frames(s, sr=sr, hop_length=HOP)):
                                      int(librosa.time_to_frames(s + 1, sr=sr, hop_length=HOP))])
                       for s in range(int(dur))])
    sec_db_s = ndi.uniform_filter1d(sec_db, 5)
    top = np.argsort(-sec_db_s)
    peak_secs = []
    for s in top:
        if all(abs(s - p) > 15 for p in peak_secs):
            peak_secs.append(int(s))
        if len(peak_secs) == 5:
            break
    # strong onsets (accents) usable as cut points
    on_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=HOP, backtrack=False)
    on_times = librosa.frames_to_time(on_frames, sr=sr, hop_length=HOP)
    strengths = onset_env[on_frames]
    accents = [round(float(t), 2) for t, s in zip(on_times, strengths) if s > np.percentile(strengths, 92)]

    out = {
        "file": str(WAV.relative_to(ROOT)),
        "duration_sec": round(dur, 3),
        "sample_rate_source": 48000,
        "tempo_bpm_estimate": round(tempo, 2),
        "beat_count": int(len(beat_times)),
        "beats": [round(float(b), 3) for b in beat_times],
        "structural_boundaries_sec": bounds,
        "segments": segs,
        "vocal_regions_estimate": merged,
        "loudness_peaks_sec": sorted(peak_secs),
        "accent_onsets_sec": accents,
        "loudness_per_second_db": [round(float(v), 2) for v in sec_db],
        "vocal_activity_per_second": [round(float(np.mean(voc_n[int(librosa.time_to_frames(s, sr=sr, hop_length=HOP)):
                                                               int(librosa.time_to_frames(s + 1, sr=sr, hop_length=HOP))])), 3)
                                      for s in range(int(dur))],
        "notes": "vocal regions are a REPET-SIM foreground estimate, not ground truth; verify by ear.",
    }
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "audio_analysis.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))

    # ---------- chart
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    font_manager.fontManager.addfont("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc")
    plt.rcParams["font.family"] = "WenQuanYi Zen Hei"
    plt.rcParams["axes.unicode_minus"] = False
    tt = t_frames(len(loud))
    fig, ax = plt.subplots(4, 1, figsize=(18, 10), sharex=True)
    ax[0].plot(tt, rms_db, lw=0.3, color="#999")
    ax[0].plot(tt, loud, lw=1.5, color="#111")
    ax[0].set_ylabel("响度 dB")
    for p in peak_secs:
        ax[0].axvline(p, color="#b0302a", lw=1)
    ax[1].plot(times, voc_n, color="#1d4f6b", lw=1)
    for r in merged:
        ax[1].axvspan(r[0], r[1], color="#1d4f6b", alpha=0.15)
    ax[1].set_ylabel("人声估计")
    ax[2].plot(t_frames(len(centroid)), smooth(centroid, 2.0), color="#8a6a2a")
    ax[2].set_ylabel("亮度 Hz")
    ax[3].plot(np.arange(n) * 0.5, nov, color="#333")
    ax[3].set_ylabel("结构新颖度")
    for a in ax:
        for b in bounds:
            a.axvline(b, color="#b0302a", lw=0.8, ls="--", alpha=0.6)
    ax[3].set_xlabel("时间 (秒)")
    ax[3].set_xticks(np.arange(0, dur, 10))
    fig.suptitle(f"《勿听》音频分析  时长 {dur:.2f}s  速度估计 {tempo:.1f} BPM")
    fig.tight_layout()
    fig.savefig(ROOT / "reports" / "audio_analysis.png", dpi=90)

    # foreground (REPET-SIM) spectrogram 0-4 kHz, 4 rows, for visual vocal verification
    fmax_bin = np.searchsorted(freqs, 4000)
    D = librosa.amplitude_to_db(S_fg[:fmax_bin], ref=np.max)
    rows = 4
    seg = int(np.ceil(D.shape[1] / rows))
    fig2, ax2 = plt.subplots(rows, 1, figsize=(20, 12))
    for r in range(rows):
        part = D[:, r * seg:(r + 1) * seg]
        t0 = r * seg * HOP / sr
        ax2[r].imshow(part, origin="lower", aspect="auto", cmap="gray_r", vmin=-60, vmax=0,
                      extent=[t0, t0 + part.shape[1] * HOP / sr, 0, 4000])
        ax2[r].set_xticks(np.arange(np.ceil(t0 / 5) * 5, t0 + part.shape[1] * HOP / sr, 5))
        ax2[r].set_ylabel("Hz")
    fig2.suptitle("前景频谱（REPET-SIM 分离，0-4kHz）— 用于目视核对人声段")
    fig2.tight_layout()
    fig2.savefig(ROOT / "reports" / "audio_foreground_spectrogram.png", dpi=80)

    print(json.dumps({k: v for k, v in out.items() if k not in ("beats", "loudness_per_second_db", "vocal_activity_per_second", "accent_onsets_sec")},
                     ensure_ascii=False, indent=1))
    print("accents:", accents)


if __name__ == "__main__":
    sys.exit(main())
