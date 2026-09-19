# iOS Safari: нижняя панель адреса перекрывает интерфейс

## Что происходит
В iOS Safari нижняя плавающая панель с адресом лежит поверх нижней части страницы. Если нижняя навигация или кнопки прижаты к краю, часть из них оказывается под панелью. Панель прячется при прокрутке вниз, но пользователь всё равно «теряет» кнопки.

## Что нужно в коде CRM

### 1. Мета-тег viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
```
`viewport-fit=cover` включает безопасные отступы, `interactive-widget=resizes-content` — корректное поведение при открытой клавиатуре.

### 2. Высоты: не `100vh`
```css
html { height: 100%; }
body { min-height: 100svh; min-height: 100dvh; }  /* svh — запасной вариант для старых Safari */
```
`100vh` в Safari считается без панели, поэтому низ уезжает под неё.

### 3. Нижняя навигация и плавающие кнопки
```css
.bottom-nav { position: fixed; bottom: max(12px, env(safe-area-inset-bottom)); }
.fab        { bottom: calc(env(safe-area-inset-bottom) + 80px); }
main        { padding-bottom: max(6.5rem, calc(env(safe-area-inset-bottom) + 5.75rem)); }
```
`env(safe-area-inset-bottom)` в iOS 15+ учитывает в том числе область панели Safari.

### 4. Главное решение: установка на экран «Домой»
В режиме standalone панель Safari исчезает полностью, приложение занимает весь экран. Нужны манифест и мета-теги:
```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="On Top" />
```
```json
{ "name": "On Top Property CRM", "short_name": "On Top", "start_url": "/", "display": "standalone",
  "background_color": "#F5F7FA", "theme_color": "#F5F7FA",
  "icons": [ { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
             { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" } ] }
```
Риелтору один раз показать: «Поделиться» → «На экран Домой». После этого CRM открывается без адресной строки, как приложение.

### 5. Если нужен точный расчёт под клавиатуру
```js
const vv = window.visualViewport;
const apply = () => document.documentElement.style.setProperty('--vvb', (innerHeight - vv.height - vv.offsetTop) + 'px');
vv?.addEventListener('resize', apply); vv?.addEventListener('scroll', apply); apply();
```
Затем `bottom: calc(env(safe-area-inset-bottom) + var(--vvb, 0px))` у фиксированных панелей.

## Что уже сделано в превью (готово к переносу)

| Файл | Что внутри |
|---|---|
| `public/manifest.webmanifest` | name, standalone, `display_override`, portrait, ярлыки «Сегодня / Лиды / Объекты», три иконки |
| `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Android; маскируемая с запасом под обрезку в круг или сквиркл |
| `public/apple-touch-icon.png` (180) | iOS |
| `public/splash-*.png` (4 размера) | Экраны запуска iPhone: 13/14, 15/16, Max, X |
| `public/sw.js` | Сервис-воркер: HTML — сеть с откатом в кэш, ассеты — кэш с фоновым обновлением, чистка старых версий |
| `src/components/shell/install.tsx` | `InstallCard` в настройках (всплывающей подсказки нет по решению заказчика), инструкция для iOS, системное окно для Android |
| `index.html` | viewport-fit=cover, interactive-widget, apple-мета, манифест, сплэши |
| `styles/app.css` | `@media (display-mode: standalone)`: отступ под статус-бар, посадка нижней навигации |

**Android (Chrome):** системное окно установки через `beforeinstallprompt`, кнопка «Установить» в настройках и подсказка на «Сегодня».
**iOS (Safari):** своего окна нет, поэтому показывается инструкция «Поделиться → На экран Домой» в три шага.
**Оба:** после установки карточка в настройках меняется на «Приложение установлено».

## Перенос в настоящую CRM (Next.js)
1. Скопировать `public/*` (манифест, иконки, сплэши, `sw.js`).
2. В `app/layout.tsx` добавить `export const viewport = { viewportFit: 'cover', themeColor: '#F5F7FA', interactiveWidget: 'resizes-content' }` и apple-мета.
3. Перенести `install.tsx`, подключить `InstallCard` в `/settings`.
4. Регистрацию сервис-воркера повесить на `load` (см. `src/main.tsx`), либо взять `next-pwa`.
5. Проверить: в Chrome DevTools → Application → Manifest «Installable», на iPhone — установка и отсутствие адресной строки.
