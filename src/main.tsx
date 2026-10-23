import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import iconUrl from './assets/favicon-terminal.svg?inline';
import App from './App';

// 単一HTMLで配布するため、ファビコンもデータURLで埋め込む（ファビコンは丸形圧着端子の絵）
const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/svg+xml';
link.href = iconUrl;
document.head.appendChild(link);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
