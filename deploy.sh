#!/bin/bash
# Baut das Spiel und veröffentlicht dist/ auf dem Branch gh-pages (GitHub Pages).
set -e
cd "$(dirname "$0")"
npm run build
TMP=$(mktemp -d)
cp -R dist/. "$TMP/"
touch "$TMP/.nojekyll"
REV=$(git rev-parse --short HEAD)
cd "$TMP"
git init -q
git checkout -q -b gh-pages
git add -A
git commit -qm "Deploy $REV"
git push -qf "$(cd - >/dev/null; git remote get-url origin)" gh-pages
cd - >/dev/null
rm -rf "$TMP"
echo "Veröffentlicht: https://flumos.github.io/weltenglas/ ($REV)"
