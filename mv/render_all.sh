#!/bin/bash
# usage: render_all.sh <worker> <nworkers> <outdir>
k=$1; n=$2; out=$3; total=9523; chunk=240
cd "$(dirname "$0")"
i=0
for ((a=0; a<total; a+=chunk)); do
  if (( i % n == k )); then b=$((a+chunk)); ((b>total)) && b=$total; node render.js frames "$out" $a $b; fi
  i=$((i+1))
done
echo "worker $k done"
