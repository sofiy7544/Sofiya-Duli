import * as React from 'react';
import { CalendarPlus, CheckSquare, ChevronRight, Flame, Snowflake, Sun, UserPlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api, ApiError } from '@/lib/mock/api';
import { useRouter } from '@/lib/router';
import { Sheet } from '@/components/ui/sheet';
import { QuickCapture } from './quick-capture';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import { ui, useUI } from '@/components/shell/ui-state';
import type { Priority, TaskType } from '@/lib/mock/types';
import { TASK_TYPE_LABEL } from '@/lib/labels';
import { defaultDue, duePresets, toLocalInput } from '@/lib/due';
import { relDay, time } from '@/lib/format';
import { tr } from '@/lib/i18n';

/** Quick Create: меню → форма. Поля и правила = LeadForm/QuickCapture и createTaskSchema CRM. */
export function QuickCreate() {
  const { quickCreate } = useUI();
  const open = quickCreate !== null;
  const titles = { menu: tr('Создать'), lead: tr('Новый лид'), task: tr('Новая задача'), capture: tr('Быстрый захват лида') } as const;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && ui.set({ quickCreate: null })} title={quickCreate ? titles[quickCreate] : ''}
      description={quickCreate === 'lead' ? tr('Клиент и лид создадутся одним действием.')
        : quickCreate === 'capture' ? tr('Контакт, объект и действие за один сабмит. Остальное — потом.') : undefined} desktop="side" size="sm">
      {quickCreate === 'menu' && <Menu />}
      {quickCreate === 'capture' && <QuickCapture />}
      {quickCreate === 'lead' && <LeadQuickForm />}
      {quickCreate === 'task' && <TaskQuickForm />}
    </Sheet>
  );
}

function Menu() {
  const items = [
    { key: 'lead' as const, icon: UserPlus, title: tr('Лид'), text: tr('Новый запрос клиента в воронку') },
    { key: 'task' as const, icon: CheckSquare, title: tr('Задача'), text: tr('Звонок, показ или напоминание') },
  ];
  /* Событие открывается своим листом: он же переносит существующие. */
  const openEvent = () => ui.set({ quickCreate: null, eventForm: true });
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <button key={it.key} onClick={() => ui.set({ quickCreate: it.key })} className="pressable surface flex w-full items-center gap-3.5 p-3.5 text-left">
          <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-primary-soft text-primary-text"><it.icon className="h-5 w-5" aria-hidden /></span>
          <span className="flex-1"><span className="block text-[15.5px] font-semibold">{it.title}</span><span className="t-caption">{it.text}</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      ))}
      <button onClick={openEvent} className="pressable surface flex w-full items-center gap-3.5 p-3.5 text-left">
        <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-primary-soft text-primary-text"><CalendarPlus className="h-5 w-5" aria-hidden /></span>
        <span className="flex-1"><span className="block text-[15.5px] font-semibold">{tr('Событие')}</span><span className="t-caption">{tr('Показ, встреча или звонок в календарь')}</span></span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>
      <p className="t-caption px-1">{tr('В карточке лида или клиента показ назначается быстрее: клиент там уже выбран.')}</p>
    </div>
  );
}

const PRIORITIES: { value: Priority; label: string; icon: typeof Flame }[] = [
  { value: 'hot', label: tr('Горячий'), icon: Flame }, { value: 'warm', label: tr('Тёплый'), icon: Sun }, { value: 'cold', label: tr('Холодный'), icon: Snowflake },
];

function LeadQuickForm() {
  const router = useRouter();
  const [v, setV] = React.useState({ fullName: '', primaryPhone: '+33 ', priority: 'warm' as Priority, budget: '' });
  const [errors, setErrors] = React.useState<{ fullName?: string; primaryPhone?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (v.fullName.trim().length < 2) e.fullName = tr('Минимум 2 символа');
    if (!/^[+0-9()\-\s]{6,32}$/.test(v.primaryPhone.trim()) || v.primaryPhone.replace(/\D/g, '').length < 6) e.primaryPhone = tr('Цифры, +, скобки и дефис, от 6 символов');
    setErrors(e); return !Object.keys(e).length;
  };
  React.useEffect(() => { if (touched) validate(); /* eslint-disable-next-line */ }, [v]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTouched(true); if (!validate()) return;
    setBusy(true);
    try {
      const lead = await api.createLead({ fullName: v.fullName, primaryPhone: v.primaryPhone.trim(), priority: v.priority, budgetMax: Number(v.budget.replace(/\D/g, '')) || undefined });
      ui.set({ quickCreate: null });
      toast.success(tr('Лид создан'), { action: { label: tr('Открыть'), onClick: () => router.navigate(`/leads/${lead.id}`) } });
    } catch (err) { toast.error((err as ApiError).message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={tr('Имя клиента')} required error={errors.fullName}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.fullName} autoComplete="name" value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} placeholder={tr('Например, Ольга Ткаченко')} />}</Field>
      <Field label={tr('Телефон')} required error={errors.primaryPhone}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.primaryPhone} type="tel" inputMode="tel" className="tabular" value={v.primaryPhone} onChange={(e) => setV({ ...v, primaryPhone: e.target.value })} />}</Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">{tr('Приоритет')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => (
            <button key={p.value} type="button" aria-pressed={v.priority === p.value} onClick={() => setV({ ...v, priority: p.value })}
              className={cn('flex h-12 items-center justify-center gap-1.5 rounded-control border text-[14px] font-medium transition-[background-color,border-color,color] duration-tab',
                v.priority === p.value ? 'border-primary bg-primary-soft text-primary-text' : 'border-border bg-surface text-muted-foreground hover:text-foreground')}>
              <p.icon className="h-4 w-4" aria-hidden />{p.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label={tr('Бюджет до, €')} hint={tr('Можно заполнить позже')}>{(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" className="tabular" value={v.budget} onChange={(e) => setV({ ...v, budget: e.target.value.replace(/[^\d\s]/g, '') })} placeholder="1 500 000" />}</Field>
      <div className="flex gap-2.5 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => ui.set({ quickCreate: 'menu' })}>{tr('Назад')}</Button>
        <Button type="submit" className="flex-[2]" loading={busy}>{tr('Создать лид')}</Button>
      </div>
    </form>
  );
}

function TaskQuickForm() {
  const router = useRouter();
  const presets = React.useMemo(() => duePresets(), []);
  const [v, setV] = React.useState({ title: '', type: 'CALL' as TaskType, due: toLocalInput(defaultDue(presets)) });
  const [error, setError] = React.useState<string | null>(null);
  const [dueError, setDueError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) { setError(tr('Введите название задачи')); return; }
    const at = new Date(v.due);
    if (!v.due || Number.isNaN(at.getTime())) { setDueError(tr('Укажите срок')); return; }
    setBusy(true);
    try {
      const task = await api.createTask({ title: v.title.trim(), type: v.type, dueAt: at.toISOString() });
      ui.set({ quickCreate: null });
      // Срок по умолчанию часто не сегодняшний, и задача попадает во вкладку, которую
      // никто не открыл: без этой кнопки после «Задача создана» список не меняется.
      toast.success(tr('Задача создана'), { action: { label: tr('Показать'), onClick: () => { ui.set({ focusTask: task.id }); router.navigate('/tasks'); } } });
    }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const iso = v.due && !Number.isNaN(new Date(v.due).getTime()) ? new Date(v.due).toISOString() : null;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={tr('Что сделать')} required error={error}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!error} value={v.title} maxLength={200} onChange={(e) => { setV({ ...v, title: e.target.value }); setError(null); }} placeholder={tr('Позвонить и подтвердить показ')} />}</Field>
      <Field label={tr('Тип')}>{(id) => <Select id={id} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as TaskType })}>{(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((t) => <option key={t} value={t}>{TASK_TYPE_LABEL[t]}</option>)}</Select>}</Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">{tr('Срок')}</legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const on = v.due === toLocalInput(p.at);
            return (
              <button key={p.k} type="button" aria-pressed={on} onClick={() => { setV({ ...v, due: toLocalInput(p.at) }); setDueError(null); }}
                className={cn('h-11 rounded-full border px-4 text-[14px] font-medium transition-colors duration-tab', on ? 'border-primary bg-primary-soft text-primary-text' : 'border-border bg-surface text-muted-foreground')}>{p.label}</button>
            );
          })}
        </div>
        {/* Точное время — системным полем: на iPhone это тот же барабан, что в будильнике. */}
        <div className="mt-3">
          <Field label={tr('или точное время')} error={dueError}>
            {(id, d) => <Input id={id} aria-describedby={d} invalid={!!dueError} required type="datetime-local" value={v.due}
              onChange={(e) => { setV({ ...v, due: e.target.value }); setDueError(null); }} />}
          </Field>
        </div>
        {iso && !dueError && <p className="t-caption mt-2">{tr('Напомню')} {relDay(iso).toLowerCase()} {tr('в')} {time(iso)}</p>}
      </fieldset>
      <div className="flex gap-2.5 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => ui.set({ quickCreate: 'menu' })}>{tr('Назад')}</Button>
        <Button type="submit" className="flex-[2]" loading={busy}>{tr('Создать задачу')}</Button>
      </div>
    </form>
  );
}
