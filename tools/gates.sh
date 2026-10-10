#!/bin/bash
# tools/gates.sh "args after seed" seeds...
ARGS=$1; shift
for s in "$@"; do node tools/gates.ts $s $ARGS & done; wait
