#!/usr/bin/env bash
# Kullanım: bash prepare_hero.sh   (ffmpeg ve python3 gerekir)
set -euo pipefail
FFMPEG_BIN=$(command -v ffmpeg || echo "./node_modules/.pnpm/ffmpeg-static@5.3.0/node_modules/ffmpeg-static/ffmpeg")
SRC="public/hero/src"; OUT="public/hero/frames"
FPS=16; MAX_SEC=6; Q=72; W_DESKTOP=1280; W_MOBILE=800
CLIPS="intro open_1 open_2 open_3 open_4"

for c in $CLIPS; do
  [ -f "$SRC/$c.mp4" ] || { echo "EKSIK: $SRC/$c.mp4"; exit 1; }
  for set in desktop:$W_DESKTOP mobile:$W_MOBILE; do
    name=${set%%:*}; w=${set##*:}
    mkdir -p "$OUT/$name/$c"; rm -f "$OUT/$name/$c/"*.webp
    "$FFMPEG_BIN" -y -loglevel error -t $MAX_SEC -i "$SRC/$c.mp4" -an \
      -vf "fps=$FPS,scale=$w:-2:flags=lanczos" \
      -c:v libwebp -quality $Q "$OUT/$name/$c/%04d.webp"
  done
done

python3 - <<'PY'
import os, json
out = "public/hero/frames"
clips = ["intro", "open_1", "open_2", "open_3", "open_4"]
data = {"fps": 16, "clips": {c: len(os.listdir(f"{out}/desktop/{c}")) for c in clips}}
json.dump(data, open("public/hero/frames.json", "w"), indent=2)
print(data)
PY
