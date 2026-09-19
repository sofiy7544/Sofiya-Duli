import * as React from 'react';
import { Check, Download, Share, SquarePlus } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

/**
 * Установка CRM на телефон.
 * Android/Chrome: системное окно установки через `beforeinstallprompt`.
 * iOS Safari: своего окна нет — показываем короткую инструкцию «Поделиться → На экран Домой».
 * В режиме приложения (standalone) блок не показывается.
 */
type Platform = 'android' | 'ios' | 'desktop';

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
function detect(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function useInstall() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(isStandalone);
  React.useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    addEventListener('beforeinstallprompt', onPrompt);
    addEventListener('appinstalled', onInstalled);
    return () => { removeEventListener('beforeinstallprompt', onPrompt); removeEventListener('appinstalled', onInstalled); };
  }, []);
  const platform = detect();
  const install = React.useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferred(null);
    return outcome === 'accepted';
  }, [deferred]);
  return { platform, installed, canPrompt: !!deferred, install };
}

/** Карточка в настройках: всегда доступна, пока приложение не установлено. */
export function InstallCard() {
  const { platform, installed, canPrompt, install } = useInstall();
  const [ios, setIos] = React.useState(false);
  if (installed) {
    return (
      <div className="surface flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-success/14 text-success-text"><Check className="h-5 w-5" aria-hidden /></span>
        <div><div className="text-[15.5px] font-medium">Приложение установлено</div><div className="t-caption">CRM открывается на весь экран, без адресной строки</div></div>
      </div>
    );
  }
  return (
    <>
      <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-primary-soft text-primary"><Download className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15.5px] font-medium">Установить на телефон</div>
          <div className="t-caption">Откроется во весь экран, без панели браузера. Работает и без сети.</div>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => { if (canPrompt) { void install(); } else { setIos(true); } }}>Установить</Button>
      </div>
      <InstallGuide open={ios} onOpenChange={setIos} platform={platform} />
    </>
  );
}

function InstallGuide({ open, onOpenChange, platform }: { open: boolean; onOpenChange: (o: boolean) => void; platform: Platform }) {
  const steps = platform === 'ios'
    ? [{ icon: Share, t: 'Нажмите «Поделиться»', s: 'Кнопка со стрелкой внизу Safari' },
       { icon: SquarePlus, t: 'Выберите «На экран Домой»', s: 'Пролистайте список вниз' },
       { icon: Check, t: 'Нажмите «Добавить»', s: 'Иконка появится на рабочем столе' }]
    : [{ icon: Share, t: 'Откройте меню браузера', s: 'Три точки в правом верхнем углу' },
       { icon: SquarePlus, t: 'Выберите «Установить приложение»', s: 'Или «Добавить на главный экран»' },
       { icon: Check, t: 'Подтвердите установку', s: 'Иконка появится на рабочем столе' }];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Добавить на экран «Домой»" description="Займёт пятнадцать секунд" desktop="center" size="sm">
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.t} className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">{i + 1}</span>
            <span className="min-w-0 flex-1 pt-1"><span className="block text-[15px] font-medium">{s.t}</span><span className="t-caption">{s.s}</span></span>
            <s.icon className="mt-2 h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
          </li>
        ))}
      </ol>
      <p className="t-caption mt-4">После установки CRM открывается во весь экран: адресная строка Safari больше не перекрывает нижние кнопки.</p>
    </Sheet>
  );
}
