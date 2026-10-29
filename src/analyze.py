"""Audio analysis: beats, accents, loudness envelope and section boundaries.

Writes build/analysis.json, which drives every timed event in the animation.
"""
import json
import sys

import librosa
import numpy as np

FPS = 30


def envelopes(y, sr, n_frames, hop=512):
    """Loudness and low-frequency (drum/bass) energy per video frame, 0..1."""
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    t_rms = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    t_vid = np.arange(n_frames) / FPS
    loud = np.interp(t_vid, t_rms, rms)
    k = np.ones(15) / 15
    loud = np.convolve(loud, k, mode="same")
    loud = np.clip(loud / np.percentile(loud, 98), 0, 1)

    S = np.abs(librosa.stft(y, hop_length=hop, n_fft=2048))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low = S[freqs < 180].mean(axis=0)
    low = np.interp(t_vid, t_rms[: len(low)], low)
    low = np.clip(low / np.percentile(low, 98), 0, 1)
    return loud, low


def main(wav_path, out_path):
    y, sr = librosa.load(wav_path, sr=22050)
    dur = len(y) / sr
    hop = 512

    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop)
    beat_t = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
    beat_s = oenv[beats] / (oenv.max() + 1e-9)

    # Downbeat phase: the beat offset (mod 4) carrying the most onset energy.
    phase = int(np.argmax([oenv[beats[p::4]].mean() for p in range(4)]))
    downbeats = beat_t[phase::4]

    # Accents: prominent onset peaks, at least 1.2 s apart.
    env = oenv / (oenv.max() + 1e-9)
    peaks = librosa.util.peak_pick(env, pre_max=20, post_max=20, pre_avg=40,
                                   post_avg=40, delta=0.12, wait=int(1.2 * sr / hop))
    peaks = [p for p in peaks if env[p] > np.percentile(env, 92)]
    accents = librosa.frames_to_time(np.array(peaks, dtype=int), sr=sr, hop_length=hop)

    n_frames = int(np.ceil(dur * FPS))
    loud, low = envelopes(y, sr, n_frames)

    # Section boundaries from beat-synchronous chroma + MFCC clustering.
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
    feat = np.vstack([librosa.util.normalize(chroma, axis=1),
                      librosa.util.normalize(mfcc, axis=1)])
    fs = librosa.util.sync(feat, beats, aggregate=np.median)
    bounds = librosa.segment.agglomerative(fs, 12)
    sections = [float(beat_t[i]) if i < len(beat_t) else dur for i in bounds]

    out = {
        "duration": dur,
        "fps": FPS,
        "tempo": float(np.atleast_1d(tempo)[0]),
        "beats": [round(float(b), 3) for b in beat_t],
        "beat_strength": [round(float(s), 3) for s in beat_s],
        "downbeats": [round(float(b), 3) for b in downbeats],
        "accents": [round(float(a), 3) for a in accents],
        "sections": [round(s, 2) for s in sections],
        "loudness": [round(float(v), 3) for v in loud],
        "low": [round(float(v), 3) for v in low],
    }
    with open(out_path, "w") as f:
        json.dump(out, f)
    print(f"duration {dur:.2f}s tempo {out['tempo']:.1f} beats {len(beat_t)} "
          f"accents {len(accents)}")
    print("sections", out["sections"])
    print("accents", out["accents"])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
