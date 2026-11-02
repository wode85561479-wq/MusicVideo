# MusicVideo

An animated lyric music video for a song whose hook is “感觉好累，但还是要上班”.
Everything is procedural: it is drawn frame by frame with HTML Canvas in headless Chromium, with no stock footage and no AI images.

## Look

- Cinematic flat illustration. The frame is 2.39:1 letterboxed and the characters are clothed and shaded, with rim light and cast shadows.
- Lighting follows the time of day: pre-dawn blue, a bright morning, white office daylight, a warm sunset, a dark late night, a golden dream afternoon, and finally sunrise.
- The final encode applies an ARRI-inspired 3D LUT (`mv/arri_look.cube`): soft highlight roll-off, a gentle toe, natural skin tones, olive greens and cool shadows.
- Lyrics are burned in, in Noto Serif SC, with a per-character reveal. They are timed from the song's embedded Suno lyric track. `mv/lyrics.srt` is the same text as a plain subtitle file.
- The HUD shows a story clock (top left) and the chapter (top right): 清晨 → 早高峰 → 工位 → 循环 → 如果有一天 → 继续走.

## Rendering

```
python3 mv/analyze.py song.m4a work/audio.json      # beats / energy per frame
python3 mv/prep.py                                   # lyrics.js / audio.js / srt
python3 mv/make_lut.py                               # ARRI-style LUT
node mv/render.js frames full 0 9523                 # or mv/render_all.sh <k> <n> <dir> for parallel workers
ffmpeg -framerate 24 -i full/f_%06d.jpg -i song.m4a \
  -vf lut3d=file=work/arri_look.cube:interp=tetrahedral \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest mv.mp4
```

Fonts are expected in `../fonts`: Noto Serif SC, Noto Sans SC, JetBrains Mono and Cormorant Garamond from Google Fonts.
`index.html` loads `core.js` (utilities and post-processing), `figure.js` (the character system), `main.js` (timeline, transitions and HUD/lyrics) and `scenes1–6.js` (the shots).
