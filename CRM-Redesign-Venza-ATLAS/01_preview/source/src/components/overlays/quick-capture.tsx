import * as React from 'react';
import { CalendarClock, MessageSquare, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store } from '@/lib/mock/store';
import { useRouter } from '@/lib/router';
import { ui } from '@/components/shell/ui-state';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { PickerField } from '@/components/ui/picker';
import { SegmentedControl } from '@/components/ui/segmented';
import { toast } from '@/components/ui/toast';
import { tr } from '@/lib/i18n';

/**
 * «Быстрый захват лида» — «молния» в шапке работающей CRM.
 * Устройство повторяет её экран: контакт → объект интереса → что дальше,
 * всё одним сабмитом, остальное дозаполняется позже.
 *
 * Разница с обычным «Создать → Лид»: там только клиент и лид, здесь ещё
 * объект и первое действие, поэтому после звонка не остаётся хвостов.
 */
type ContactMode = 'new' | 'crm';
type PropertyMode = 'new' | 'crm' | 'none';
type NextStep = 'interest' | 'showing';

const CODES = [
  { code: '+380', flag: '🇺🇦', placeholder: '67 123 45 67' },
  { code: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { code: '+39', flag: '🇮🇹', placeholder: '312 345 6789' },
  { code: '+48', flag: '🇵🇱', placeholder: '512 345 678' },
];

/** Заготовки заметки: те же роли, что у чипов в CRM. */
const CHIPS = [
  { key: 'callback', label: tr('Перезвонить'), text: tr('Клиент просил перезвонить.') },
  { key: 'deal', label: tr('Договорённость'), text: tr('Договорились о следующем шаге.') },
  { key: 'clarify', label: tr('Уточнить'), text: tr('Нужно уточнить детали по объекту.') },
  { key: 'custom', label: tr('Свой текст'), text: '' },
];

const todayAt = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(); d.setHours(h || 12, m || 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
};

export function QuickCapture() {
  const router = useRouter();
  const [contactMode, setContactMode] = React.useState<ContactMode>('new');
  const [propertyMode, setPropertyMode] = React.useState<PropertyMode>('new');
  const [next, setNext] = React.useState<NextStep>('interest');
  const [chip, setChip] = React.useState('callback');
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<{ fullName?: string; phone?: string }>({});

  const [v, setV] = React.useState({
    fullName: '', code: '+380', phone: '',
    clientId: '', district: '', address: '', price: '', propertyId: '',
    note: tr('Клиент просил перезвонить.'), showingAt: '16:30',
  });

  const clients = store.db.clients.filter((c) => !c.isArchived);
  const properties = store.db.properties;
  const codeInfo = CODES.find((c) => c.code === v.code) ?? CODES[0];

  const pickChip = (key: string) => {
    setChip(key);
    const found = CHIPS.find((c) => c.key === key);
    if (found && found.key !== 'custom') setV((s) => ({ ...s, note: found.text }));
    if (found?.key === 'custom') setV((s) => ({ ...s, note: '' }));
  };

  const submit = async () => {
    const e: typeof errors = {};
    if (contactMode === 'new') {
      if (!v.fullName.trim()) e.fullName = tr('Без имени лид не найти потом');
      if (v.phone.replace(/\D/g, '').length < 7) e.phone = tr('Проверьте номер');
    } else if (!v.clientId) e.fullName = tr('Выберите клиента из CRM');
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setBusy(true);
    try {
      const name = contactMode === 'new' ? v.fullName.trim() : (clients.find((c) => c.id === v.clientId)?.fullName ?? '');
      const budgetMax = Number(v.price.replace(/[^\d]/g, '')) || undefined;
      const lead = await api.createLead({ fullName: name, primaryPhone: `${v.code} ${v.phone}`.trim(), priority: 'warm', budgetMax });

      if (next === 'showing') {
        await api.createTask({ title: tr('Показ: {name}', { name }), type: 'SHOWING', dueAt: todayAt(v.showingAt), leadId: lead.id });
      } else if (v.note.trim()) {
        await api.createTask({ title: v.note.trim(), type: 'CALL', dueAt: todayAt('10:00'), leadId: lead.id });
      }

      ui.set({ quickCreate: null });
      toast.success(tr('Лид создан'), { action: { label: tr('Открыть'), onClick: () => router.navigate(`/leads/${lead.id}`) } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Контакт */}
      <section>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tr('1. Контакт')}</h3>
          <SegmentedControl<ContactMode> label={tr('Откуда контакт')} size="sm" value={contactMode} onChange={setContactMode}
            options={[{ value: 'new', label: tr('Новый') }, { value: 'crm', label: tr('Из CRM') }]} />
        </div>
        {contactMode === 'new' ? (
          <div className="space-y-3">
            <Field label={tr('ФИО')} error={errors.fullName}>
              {(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.fullName} value={v.fullName}
                onChange={(e) => setV({ ...v, fullName: e.target.value })} placeholder={tr('Ирина Савчук')} autoComplete="name" />}
            </Field>
            <Field label={tr('Телефон')} error={errors.phone}>
              {(id, d) => (
                <div className="flex gap-2">
                  <Select aria-label={tr('Код страны')} className="w-[136px] flex-none" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })}>
                    {CODES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </Select>
                  <Input id={id} aria-describedby={d} invalid={!!errors.phone} className="flex-1" type="tel" inputMode="tel"
                    value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} placeholder={codeInfo.placeholder} autoComplete="tel-national" />
                </div>
              )}
            </Field>
          </div>
        ) : (
          <PickerField label={tr('Клиент из базы')} error={errors.fullName} emptyLabel={tr('Выберите клиента')}
            value={v.clientId} onChange={(clientId) => setV({ ...v, clientId })}
            options={clients.map((c) => ({ value: c.id, label: c.fullName, meta: c.primaryPhone }))} />
        )}
      </section>

      {/* 2. Объект интереса */}
      <section>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tr('2. Объект интереса')}</h3>
          <SegmentedControl<PropertyMode> label={tr('Объект интереса')} size="sm" value={propertyMode} onChange={setPropertyMode}
            options={[{ value: 'new', label: tr('Новый') }, { value: 'crm', label: tr('Из CRM') }, { value: 'none', label: tr('Без') }]} />
        </div>
        {propertyMode === 'new' && (
          <div className="space-y-3">
            <Field label={tr('Район')}>{(id, d) => <Input id={id} aria-describedby={d} value={v.district} onChange={(e) => setV({ ...v, district: e.target.value })} placeholder={tr('Набережная')} />}</Field>
            <Field label={tr('Адрес')}>{(id, d) => <Input id={id} aria-describedby={d} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} placeholder={tr('ул. Приморская, 14')} />}</Field>
            <Field label={tr('Цена')}>{(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} placeholder="450 000" />}</Field>
            <p className="t-caption">{tr('Тип, площадь и фото дозаполните позже: объект создастся как «Квартира», тип меняется на его странице.')}</p>
          </div>
        )}
        {propertyMode === 'crm' && (
          <PickerField label={tr('Объект из базы')} emptyLabel={tr('Выберите объект')} searchPlaceholder={tr('Найти по названию или району')}
            value={v.propertyId} onChange={(propertyId) => setV({ ...v, propertyId })}
            options={properties.map((p) => ({ value: p.id, label: p.title, meta: p.district }))} />
        )}
        {propertyMode === 'none' && <p className="t-caption">{tr('Объект добавите позже — из карточки лида.')}</p>}
      </section>

      {/* 3. Что дальше */}
      <section>
        <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tr('3. Что дальше')}</h3>
        <div role="radiogroup" aria-label={tr('Следующее действие')} className="space-y-2">
          {([
            { key: 'interest' as const, icon: MessageSquare, title: tr('Интерес'), text: tr('Записать заметку, перезвонить потом') },
            { key: 'showing' as const, icon: CalendarClock, title: tr('Показ'), text: tr('Назначить дату и время показа') },
          ]).map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={next === o.key} onClick={() => setNext(o.key)}
              className={cn('flex w-full items-start gap-3 rounded-card border p-3 text-left transition-colors',
                next === o.key ? 'border-primary bg-primary-soft/60' : 'border-border hover:bg-surface-2/60')}>
              <o.icon className={cn('mt-0.5 h-[18px] w-[18px] flex-none', next === o.key ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{o.title}</span>
                <span className="t-caption block">{o.text}</span>
              </span>
            </button>
          ))}
        </div>

        {next === 'interest' ? (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {CHIPS.map((c) => (
                <button key={c.key} type="button" aria-pressed={chip === c.key} onClick={() => pickChip(c.key)}
                  className={cn('min-h-[44px] rounded-full border px-3.5 text-[13px] font-medium transition-colors lg:min-h-[36px]',
                    chip === c.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-surface-2')}>
                  {c.label}
                </button>
              ))}
            </div>
            <label className="mt-2.5 block">
              <span className="sr-only">{tr('Текст заметки')}</span>
              <textarea value={v.note} onChange={(e) => { setV({ ...v, note: e.target.value }); setChip('custom'); }} rows={3}
                placeholder={tr('О чём договорились')}
                className="w-full resize-y rounded-control border border-border bg-surface p-3 text-[15px] outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_4px_hsl(var(--primary)/.12)]" />
            </label>
          </div>
        ) : (
          <div className="mt-3">
            <Field label={tr('Время показа')} hint={tr('Если время уже прошло, показ встанет на завтра')}>
              {(id, d) => <Input id={id} aria-describedby={d} required type="time" value={v.showingAt} onChange={(e) => setV({ ...v, showingAt: e.target.value })} />}
            </Field>
          </div>
        )}
      </section>

      {/* Кнопки прилипают к низу листа: форма длиннее экрана, и «Создать» уезжал
          под сгиб — до него приходилось прокручивать всю форму. */}
      <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2.5 border-t border-border/70 bg-surface px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => ui.set({ quickCreate: null })}>{tr('Отмена')}</Button>
        <Button type="button" className="flex-1" loading={busy} onClick={submit}><Zap />{tr('Создать')}</Button>
      </div>
    </div>
  );
}
