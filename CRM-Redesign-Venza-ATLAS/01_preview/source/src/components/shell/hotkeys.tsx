import * as React from 'react';
import { useRouter } from '@/lib/router';
import { Sheet } from '@/components/ui/sheet';
import { ui } from './ui-state';

/**
 * Горячие клавиши — как hotkeys-provider.tsx в CRM: ⌘K поиск, ⌘N клиент,
 * ⌘L лид, ⌘O объект, ⌘S событие, Shift+? справка.
 *
 * Поиск слушает ⌘K сам (components/overlays/search.tsx), здесь его нет.
 * В поле ввода клавиши не перехватываем, кроме комбинаций с ⌘/Ctrl: иначе
 * «?» в тексте заметки открывал бы справку.
 */
type Hotkey = { keys: string; label: string; run: (r: ReturnType<typeof useRouter>) => void };

const LIST: Hotkey[] = [
  { keys: 'K', label: 'Поиск по клиентам, лидам и объектам', run: () => ui.set({ search: true }) },
  { keys: 'N', label: 'Новый клиент', run: (r) => r.navigate('/clients/new') },
  { keys: 'L', label: 'Новый лид', run: (r) => r.navigate('/leads/new') },
  { keys: 'O', label: 'Новый объект', run: (r) => r.navigate('/properties/new') },
  { keys: 'S', label: 'Новое событие: показ, встреча, звонок', run: () => ui.set({ eventForm: true, quickCreate: null }) },
];

const isTyping = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  return !!node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable);
};

export function Hotkeys() {
  const router = useRouter();
  const [help, setHelp] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey && !isTyping(e.target)) { e.preventDefault(); setHelp((v) => !v); return; }
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const hit = LIST.find((h) => h.keys.toLowerCase() === e.key.toLowerCase());
      if (!hit || hit.keys === 'K') return;   // ⌘K обрабатывает поиск
      e.preventDefault();
      hit.run(router);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <Sheet open={help} onOpenChange={setHelp} title="Горячие клавиши" description="На Mac — ⌘, на Windows и Linux — Ctrl." desktop="center" size="sm">
      <ul className="row-divider surface overflow-hidden">
        {LIST.map((h) => (
          <li key={h.keys} className="flex items-center gap-3 px-4 py-3">
            <kbd className="min-w-[68px] rounded-[8px] border border-border bg-surface-2 px-2 py-1 text-center text-[13px] font-medium tabular">⌘ {h.keys}</kbd>
            <span className="text-[14.5px]">{h.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 px-4 py-3">
          <kbd className="min-w-[68px] rounded-[8px] border border-border bg-surface-2 px-2 py-1 text-center text-[13px] font-medium">⇧ ?</kbd>
          <span className="text-[14.5px]">Эта справка</span>
        </li>
        <li className="flex items-center gap-3 px-4 py-3">
          <kbd className="min-w-[68px] rounded-[8px] border border-border bg-surface-2 px-2 py-1 text-center text-[13px] font-medium">Esc</kbd>
          <span className="text-[14.5px]">Закрыть лист или окно</span>
        </li>
      </ul>
    </Sheet>
  );
}
