import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/cyrillic-500.css';
import '@fontsource/inter/cyrillic-600.css';
import '@fontsource/inter/cyrillic-700.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/cyrillic-500.css';
import '@fontsource/playfair-display/cyrillic-600.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-800.css';
import '@/styles/app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Офлайн и быстрый запуск в режиме приложения. В однофайловой сборке файла sw.js нет — молча пропускаем.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
