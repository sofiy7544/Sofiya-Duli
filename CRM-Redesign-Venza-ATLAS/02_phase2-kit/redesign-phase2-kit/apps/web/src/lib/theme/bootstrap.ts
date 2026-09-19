import { DEFAULT_THEME, LEGACY_THEME_MAP, THEMES, THEME_STORAGE_KEY } from './themes';

/**
 * Инлайн-скрипт до гидрации (§17). Вставляется в <head> root layout:
 *   <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
 * и <html suppressHydrationWarning>.
 * Заменяет старый скрипт, который знал только light/dark/sepia/midnight/system.
 */
export const themeBootstrapScript = `(function(){try{
var K=${JSON.stringify(THEME_STORAGE_KEY)},A=${JSON.stringify(THEMES)},L=${JSON.stringify(LEGACY_THEME_MAP)};
var t=localStorage.getItem(K);
if(t&&L[t]){t=L[t];localStorage.setItem(K,t);}
if(A.indexOf(t)<0)t=${JSON.stringify(DEFAULT_THEME)};
var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;
r.classList.toggle('dark',d);
r.dataset.theme=t;
r.dataset.family=t==='atlas'?'atlas':t==='venza'?'venza':'classic';
r.style.colorScheme=d?'dark':'light';
}catch(e){}})();`;
