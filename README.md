# Weltenglas

Eine Welt in einer Glasschale, in der Evolution passiert – und du gewinnst Wettbewerbe, ohne je ein Lebewesen zu steuern.

Browser-Spiel (PWA): Vite + TypeScript + Preact, Simulation im Web Worker, Geländekarte im WebGL2-Shader.

- `src/sim/` – deterministischer Sim-Kern (kein DOM, kein `Math.exp/random`): Klima, Biologie, Evolution, Kultur
- `src/game/` – Karriere, Wettbewerbe, Laden, Speichern, Audio
- `src/data/` – Wettbewerbe, Kategorien, Ausrüstung, Texte (Daten statt Code)
- `src/ui/` – Bildschirme, Renderer
- `tools/` – Bots und Prüfwerkzeuge (`node tools/run.ts 3 120`, `node tools/play.mjs`)
- `tests/` – `npm test`

```
npm install
npm run dev      # Entwicklung
npm run build    # dist/
./deploy.sh      # GitHub Pages (Branch gh-pages)
npm test
```
