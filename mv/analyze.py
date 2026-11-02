import sys, json, numpy as np, librosa, subprocess
src, out = sys.argv[1], sys.argv[2]
FPS = 24
sr = 22050
pcm = subprocess.run(['ffmpeg','-v','error','-i',src,'-ac','1','-ar',str(sr),'-f','f32le','-'],capture_output=True,check=True).stdout
y = np.frombuffer(pcm, dtype=np.float32).copy()
dur = len(y)/sr
hop = 512
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
times = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)
def band(lo,hi):
    m=(freqs>=lo)&(freqs<hi); return np.sqrt((S[m]**2).mean(0))
rms = librosa.feature.rms(S=S)[0]
bass = band(30,160); mid = band(300,3000); high = band(4000,10000)
onset = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S,ref=np.max), sr=sr)
tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop)
beat_times = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
nf = int(np.ceil(dur*FPS))
ft = np.arange(nf)/FPS
def res(x, smooth=0):
    v = np.interp(ft, times, x)
    if smooth:
        k = np.exp(-np.arange(smooth*3)/smooth); k/=k.sum()
        # causal-ish smoothing with attack: fast up, slow down
        o = np.zeros_like(v); acc=0
        a = 1-np.exp(-1/max(smooth,1e-6))
        for i,val in enumerate(v):
            acc = val if val>acc else acc + (val-acc)*a
            o[i]=acc
        v=o
    lo, hi = np.percentile(v,2), np.percentile(v,99.5)
    return np.clip((v-lo)/(hi-lo+1e-9),0,1)
feat = {
  'fps': FPS, 'duration': dur, 'tempo': float(np.atleast_1d(tempo)[0]),
  'beats': [round(float(b),3) for b in beat_times],
  'rms': [round(float(v),3) for v in res(rms,6)],
  'bass': [round(float(v),3) for v in res(bass,4)],
  'mid': [round(float(v),3) for v in res(mid,6)],
  'high': [round(float(v),3) for v in res(high,3)],
  'onset': [round(float(v),3) for v in res(onset,2)],
}
# slow loudness envelope (2s) for section intensity
k = int(FPS*2); r = np.array(feat['rms']); env = np.convolve(r, np.ones(k)/k, mode='same')
feat['energy'] = [round(float(v),3) for v in env]
json.dump(feat, open(out,'w'))
print('dur',dur,'tempo',feat['tempo'],'beats',len(beat_times))
# print energy per 5s
for s in range(0,int(dur),5):
    i=s*FPS; print(f"{s//60}:{s%60:02d} energy={env[i]:.2f} bass={np.mean(feat['bass'][i:i+5*FPS]):.2f}")
