# ui/sonner-toaster.tsx — точечная правка

Было: dark-тосты только для `dark`/`midnight` (graphite получал светлые).
Стало: берём `isDark` из провайдера — корректно для Стандарта при тёмной ОС,
ATLAS и Venza всегда светлые.

```tsx
const { isDark } = useTheme();
<Toaster theme={isDark ? 'dark' : 'light'} position="bottom-right" ... />
```

Длительности появления/исчезновения — через `toastOptions.style`:
`{ '--motion-toast-in': ..., }` не нужно — sonner анимирует сам; в Phase 7 заменить
его keyframes на `var(--motion-toast-in)` / `var(--ease-emphasized)` через className.
