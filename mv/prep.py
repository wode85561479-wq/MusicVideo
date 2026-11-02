import json, re, sys
srt = open('work/subs.srt', encoding='utf-8').read().strip().split('\n\n')
def ts(s):
    h, m, rest = s.split(':'); sec, ms = rest.split(',')
    return int(h)*3600 + int(m)*60 + int(sec) + int(ms)/1000
lines = []
for b in srt:
    l = b.split('\n'); a, e = l[1].split(' --> '); text = ' '.join(l[2:]).strip()
    if text.startswith('['): continue
    lines.append({'s': ts(a), 'e': ts(e), 'text': text, 'echo': text.endswith('……')})
# display timing
for i, L in enumerate(lines):
    nxt = lines[i+1]['s'] if i+1 < len(lines) else L['e'] + 4
    cap = 4.6 if L['echo'] else 6.2
    L['ds'] = round(L['s'] - 0.12, 3)
    L['de'] = round(min(nxt - 0.12, L['s'] + max(cap, 0), max(L['e'], L['s'] + 1.2) + 2.2), 3)
# merge very short lines with the following main line (karaoke-style reveal keeps per-part timing)
disp = []
i = 0
while i < len(lines):
    L = lines[i]
    parts = [{'t': L['ds'], 'text': L['text']}]
    de = L['de']
    while (not L['echo']) and (lines[i]['e'] - lines[i]['s'] < 1.0) and i + 1 < len(lines) and not lines[i+1]['echo']:
        i += 1
        parts.append({'t': lines[i]['ds'], 'text': lines[i]['text']})
        de = lines[i]['de']
    disp.append({'ds': L['ds'], 'de': de, 'echo': L['echo'], 'parts': parts, 'text': ' '.join(p['text'] for p in parts)})
    i += 1
json.dump(disp, open('work/lyrics.json', 'w'), ensure_ascii=False, indent=0)
open('work/lyrics.js', 'w').write('window.LYRICS=' + json.dumps(disp, ensure_ascii=False) + ';')
open('work/audio.js', 'w').write('window.AUDIO=' + open('work/audio.json').read() + ';')
print(len(lines), 'lines', len(disp), 'display lines')
for d in disp:
    if len(d['parts'])>1: print(d['text'])
# write SRT / ASS for user
def fmt(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"
with open('work/lyrics_clean.srt', 'w', encoding='utf-8') as f:
    for i, L in enumerate(disp, 1):
        f.write(f"{i}\n{fmt(L['ds'])} --> {fmt(L['de'])}\n{L['text']}\n\n")
