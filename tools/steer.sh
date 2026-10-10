#!/bin/bash
# alle Kategorien parallel
for c in green colorful foodweb landscapes rainforest sturdy bigstep; do node tools/steer.ts $c ${1:-8} > /tmp/wg_steer_$c.txt 2>&1 & done; wait
for c in green colorful foodweb landscapes rainforest sturdy bigstep; do cat /tmp/wg_steer_$c.txt; done
