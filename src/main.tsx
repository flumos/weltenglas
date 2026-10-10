import { render } from 'preact';
import { App } from './ui/App.tsx';
import './ui/style.css';

render(<App />, document.getElementById('app')!);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}

// Entwickler-Haken für Tests: ?dev=1
if (new URLSearchParams(location.search).has('dev')) {
  Promise.all([import('./game/state.ts'), import('./game/simClient.ts'), import('./game/career.ts'), import('./game/save.ts')]).then(([S, sim, career, save]) => {
    (window as unknown as Record<string, unknown>).__wg = { S, sim, career, save };
  });
}
