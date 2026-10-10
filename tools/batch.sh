#!/bin/bash
# Parallel-Lauf mehrerer Seeds: tools/batch.sh days seeds...
D=$1; shift; OUT=${OUT:-/tmp/wg}; mkdir -p $OUT
for s in "$@"; do node tools/run.ts $s $D > $OUT/run$s.txt 2>&1 & done; wait
for s in "$@"; do echo "== seed $s"; grep -E "^d(20|40|60|90|120|150|200) |ms/tick|Durchbruch|o2:|Wald" $OUT/run$s.txt | cut -c1-260; done
