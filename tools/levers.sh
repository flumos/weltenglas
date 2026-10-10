#!/bin/bash
# tools/levers.sh start days lever...
S=$1; D=$2; shift 2
for l in "$@"; do node tools/levers.ts $S $D $l ${NS:-8} > /tmp/wg_lev_$l.txt 2>&1 & done; wait
for l in "$@"; do cat /tmp/wg_lev_$l.txt; done
