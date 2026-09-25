import { LogOut, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { store, usePreviewSettings } from '@/lib/mock/store';
import { useRouter } from '@/lib/router';
import { useTheme } from '@/lib/theme/provider';
import { THEME_OPTIONS, type Theme } from '@/lib/theme/themes';
import type { DataMode, UserRole } from '@/lib/mock/types';
import { Sheet } from '@/components/ui/sheet';
import { SegmentedControl } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ui, useUI } from '@/components/shell/ui-state';
import { INTRO_EVENT } from '@/components/brand/intro';
import { Sparkles } from 'lucide-react';
import { tr } from '@/lib/i18n';

/** Панель дизайн-превью: НЕ часть CRM. Переключает тему, состояние данных, роль и флаг интеграций. */
export const THEME_NAMES: Record<Theme, string> = { atlas: 'ATLAS (стандарт)', sepia: tr('Сепия'), venza: 'Venza' };

/** Мини-макет экрана CRM в цветах темы: видно сайдбар, карточки и кнопку, а не просто цвет. */
const PREVIEW: Record<Theme, { bg: string; surface: string; rail: string; railOn: string; text: string; muted: string; primary: string; border: string }> = {
  atlas: { bg: '#F5F7FA', surface: '#FFFFFF', rail: '#121A24', railOn: '#1E2A38', text: '#101828', muted: '#C3CBD5', primary: '#235F91', border: '#E4E9F0' },
  sepia: { bg: '#F2EDE3', surface: '#F9F6F0', rail: '#E4DACA', railOn: '#D4C5AD', text: '#3B2E22', muted: '#B9A88F', primary: '#A6541D', border: '#E0D5C2' },
  venza: { bg: '#F7F4EC', surface: '#FFFEFB', rail: '#EFEADF', railOn: '#DCE3D8', text: '#1D231F', muted: '#BFC5B9', primary: '#344A39', border: '#E6E1D4' },
};

function ThemeScreen({ theme }: { theme: Theme }) {
  const c = PREVIEW[theme];
  return (
    <svg viewBox="0 0 160 112" className="block h-auto w-full" aria-hidden>
      <rect width="160" height="112" rx="8" fill={c.bg} />
      {/* сайдбар */}
      <rect x="0" y="0" width="34" height="112" rx="8" fill={c.rail} />
      <rect x="34" y="0" width="4" height="112" fill={c.rail} />
      <rect x="6" y="8" width="10" height="10" rx="3" fill={c.primary} />
      <rect x="19" y="11" width="11" height="3.5" rx="1.75" fill={c.muted} opacity=".9" />
      <rect x="4" y="26" width="26" height="9" rx="3" fill={c.railOn} />
      <rect x="7" y="29.5" width="3.5" height="3.5" rx="1" fill={c.primary} />
      <rect x="13" y="29.5" width="13" height="3" rx="1.5" fill={theme === 'atlas' ? '#E7ECF3' : c.text} opacity={theme === 'atlas' ? '.95' : '.75'} />
      {[39, 50, 61, 72].map((y) => (<g key={y}><rect x="7" y={y + 3} width="3.5" height="3.5" rx="1" fill={c.muted} /><rect x="13" y={y + 3.5} width={y % 2 ? 11 : 14} height="3" rx="1.5" fill={c.muted} opacity=".8" /></g>))}
      {/* шапка */}
      <rect x="44" y="9" width="34" height="5" rx="2.5" fill={c.text} opacity=".85" />
      <rect x="120" y="7" width="34" height="9" rx="4.5" fill={c.primary} />
      {/* три карточки-показателя */}
      {[44, 82, 120].map((x, i) => (
        <g key={x}>
          <rect x={x} y="22" width="34" height="26" rx="5" fill={c.surface} stroke={c.border} />
          <rect x={x + 5} y="27" width={16 - i * 2} height="3" rx="1.5" fill={c.muted} />
          <rect x={x + 5} y="34" width="12" height="7" rx="2" fill={c.text} opacity=".8" />
        </g>
      ))}
      {/* список */}
      <rect x="44" y="54" width="110" height="50" rx="5" fill={c.surface} stroke={c.border} />
      {[60, 73, 86].map((y, i) => (
        <g key={y}>
          <circle cx="53" cy={y + 4} r="4" fill={i === 0 ? c.primary : c.muted} opacity={i === 0 ? '.9' : '.7'} />
          <rect x="61" y={y + 1} width={i === 1 ? 44 : 54} height="3" rx="1.5" fill={c.text} opacity=".75" />
          <rect x="61" y={y + 6.5} width="30" height="2.5" rx="1.25" fill={c.muted} />
          <rect x="134" y={y + 2} width="14" height="6" rx="3" fill={c.primary} opacity=".18" />
        </g>
      ))}
    </svg>
  );
}

export function ThemeSwatches({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label={tr('Тема оформления')} className={cn('grid gap-2.5', compact ? 'grid-cols-3' : 'grid-cols-3')}>
      {THEME_OPTIONS.map((o) => {
        const on = theme === o.value;
        return (
          <button key={o.value} role="radio" aria-checked={on} onClick={() => setTheme(o.value)}
            className={cn('flex flex-col items-center gap-1.5 rounded-control p-1.5 transition-colors duration-tab', on ? 'bg-primary-soft' : 'hover:bg-surface-2')}>
            <span aria-hidden className={cn('block w-full overflow-hidden rounded-[10px] border border-border shadow-soft', on && 'ring-2 ring-primary ring-offset-2 ring-offset-surface')}>
              <ThemeScreen theme={o.value} />
            </span>
            <span className={cn('text-[12.5px] font-medium', on ? 'text-foreground' : 'text-muted-foreground')}>{THEME_NAMES[o.value]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PreviewPanel() {
  const { preview } = useUI();
  const s = usePreviewSettings();
  const router = useRouter();
  return (
    <>
      <button onClick={() => ui.set({ preview: true })} aria-label={tr('Настройки превью')}
        className="fixed left-0 top-[58%] z-[60] grid h-11 w-7 place-items-center rounded-r-[12px] border border-l-0 border-border bg-surface/95 text-muted-foreground shadow-soft backdrop-blur transition-[width] hover:w-9 hover:text-foreground">
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
      </button>
      <Sheet open={preview} onOpenChange={(o) => ui.set({ preview: o })} title={tr('Дизайн-превью')} description={tr('Панель только для просмотра дизайна. В CRM её нет.')} desktop="side" size="sm">
        <div className="space-y-6">
          <section><h3 className="t-h3 mb-2.5">{tr('Тема')}</h3><ThemeSwatches compact /></section>
          <section>
            <h3 className="t-h3 mb-1">{tr('Состояние данных')}</h3><p className="t-caption mb-2.5">{tr('Применяется ко всем экранам со списками и карточками.')}</p>
            <SegmentedControl<DataMode> label={tr('Состояние данных')} className="w-full" size="sm" value={s.dataMode} onChange={(v) => store.setSettings({ dataMode: v })}
              options={[{ value: 'ready', label: tr('Данные') }, { value: 'loading', label: tr('Загрузка') }, { value: 'empty', label: tr('Пусто') }, { value: 'error', label: tr('Ошибка') }]} />
          </section>
          <section>
            <h3 className="t-h3 mb-1">{tr('Роль')}</h3><p className="t-caption mb-2.5">{tr('Риелтор не видит «Команду» и «Отчёты».')}</p>
            <SegmentedControl<UserRole> label={tr('Роль')} className="w-full" size="sm" value={s.role} onChange={(v) => store.setSettings({ role: v })}
              options={[{ value: 'ADMIN', label: tr('Администратор') }, { value: 'REALTOR', label: tr('Риелтор') }]} />
          </section>
          <section className="flex items-center gap-3">
            <div className="flex-1"><h3 className="t-h3">{tr('Интеграции подключены')}</h3><p className="t-caption">NEXT_PUBLIC_INTEGRATIONS_ENABLED</p></div>
            <Switch label={tr('Интеграции')} checked={s.integrationsEnabled} onChange={(v) => store.setSettings({ integrationsEnabled: v })} />
          </section>
          <section>
            <h3 className="t-h3 mb-2.5">{tr('Задержка сети')}</h3>
            <SegmentedControl label={tr('Задержка')} className="w-full" size="sm" value={String(s.latencyMs)} onChange={(v) => store.setSettings({ latencyMs: Number(v) })}
              options={[{ value: '150', label: tr('Быстро') }, { value: '650', label: tr('Обычно') }, { value: '2000', label: tr('Медленно') }]} />
          </section>
          <div className="flex gap-2.5">
            <Button variant="outline" className="flex-1" onClick={() => { store.reset(); store.setSettings({ dataMode: 'ready' }); toast.success(tr('Данные сброшены')); }}><RotateCcw />{tr('Сбросить')}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { ui.set({ preview: false }); router.navigate('/login', { replace: true }); }}><LogOut />{tr('Экран входа')}</Button>
          </div>
          <Button variant="soft" className="w-full" onClick={() => { ui.set({ preview: false }); router.navigate('/login', { replace: true }); setTimeout(() => dispatchEvent(new Event(INTRO_EVENT)), 60); }}><Sparkles />{tr('Повторить интро бренда')}</Button>
        </div>
      </Sheet>
    </>
  );
}
