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

/** Quick Create: меню → форма. Поля и правила = LeadForm/QuickCapture и createTaskSchema CRM. */
export function QuickCreate() {
  const { quickCreate } = useUI();
  const open = quickCreate !== null;
  const titles = { menu: 'Создать', lead: 'Новый лид', task: 'Новая задача', capture: 'Быстрый захват лида' } as const;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && ui.set({ quickCreate: null })} title={quickCreate ? titles[quickCreate] : ''}
      description={quickCreate === 'lead' ? 'Клиент и лид создадутся одним действием.'
        : quickCreate === 'capture' ? 'Контакт, объект и действие за один сабмит. Остальное — потом.' : undefined} desktop="side" size="sm">
      {quickCreate === 'menu' && <Menu />}
      {quickCreate === 'capture' && <QuickCapture />}
      {quickCreate === 'lead' && <LeadQuickForm />}
      {quickCreate === 'task' && <TaskQuickForm />}
    </Sheet>
  );
}

function Menu() {
  const items = [
    { key: 'lead' as const, icon: UserPlus, title: 'Лид', text: 'Новый запрос клиента в воронку' },
    { key: 'task' as const, icon: CheckSquare, title: 'Задача', text: 'Звонок, показ или напоминание' },
  ];
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <button key={it.key} onClick={() => ui.set({ quickCreate: it.key })} className="pressable surface flex w-full items-center gap-3.5 p-3.5 text-left">
          <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-primary-soft text-primary-text"><it.icon className="h-5 w-5" aria-hidden /></span>
          <span className="flex-1"><span className="block text-[15.5px] font-semibold">{it.title}</span><span className="t-caption">{it.text}</span></span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      ))}
      <div className="surface-quiet flex items-center gap-3 p-3.5 text-[13.5px] text-muted-foreground">
        <CalendarPlus className="h-[18px] w-[18px] shrink-0" aria-hidden />Показ назначается из карточки лида или клиента — там уже выбран клиент.
      </div>
    </div>
  );
}

const PRIORITIES: { value: Priority; label: string; icon: typeof Flame }[] = [
  { value: 'hot', label: 'Горячий', icon: Flame }, { value: 'warm', label: 'Тёплый', icon: Sun }, { value: 'cold', label: 'Холодный', icon: Snowflake },
];

function LeadQuickForm() {
  const router = useRouter();
  const [v, setV] = React.useState({ fullName: '', primaryPhone: '+33 ', priority: 'warm' as Priority, budget: '' });
  const [errors, setErrors] = React.useState<{ fullName?: string; primaryPhone?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (v.fullName.trim().length < 2) e.fullName = 'Минимум 2 символа';
    if (!/^[+0-9()\-\s]{6,32}$/.test(v.primaryPhone.trim()) || v.primaryPhone.replace(/\D/g, '').length < 6) e.primaryPhone = 'Цифры, +, скобки и дефис, от 6 символов';
    setErrors(e); return !Object.keys(e).length;
  };
  React.useEffect(() => { if (touched) validate(); /* eslint-disable-next-line */ }, [v]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTouched(true); if (!validate()) return;
    setBusy(true);
    try {
      const lead = await api.createLead({ fullName: v.fullName, primaryPhone: v.primaryPhone.trim(), priority: v.priority, budgetMax: Number(v.budget.replace(/\D/g, '')) || undefined });
      ui.set({ quickCreate: null });
      toast.success('Лид создан', { action: { label: 'Открыть', onClick: () => router.navigate(`/leads/${lead.id}`) } });
    } catch (err) { toast.error((err as ApiError).message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Имя клиента" required error={errors.fullName}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.fullName} autoComplete="name" value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} placeholder="Например, Анна Сергеевна" />}</Field>
      <Field label="Телефон" required error={errors.primaryPhone}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.primaryPhone} type="tel" inputMode="tel" className="tabular" value={v.primaryPhone} onChange={(e) => setV({ ...v, primaryPhone: e.target.value })} />}</Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">Приоритет</legend>
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
      <Field label="Бюджет до, €" hint="Можно заполнить позже">{(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" className="tabular" value={v.budget} onChange={(e) => setV({ ...v, budget: e.target.value.replace(/[^\d\s]/g, '') })} placeholder="1 500 000" />}</Field>
      <div className="flex gap-2.5 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => ui.set({ quickCreate: 'menu' })}>Назад</Button>
        <Button type="submit" className="flex-[2]" loading={busy}>Создать лид</Button>
      </div>
    </form>
  );
}

function TaskQuickForm() {
  const [v, setV] = React.useState({ title: '', type: 'CALL' as TaskType, when: 'today18' });
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const presets = [{ k: 'in1h', l: 'Через час' }, { k: 'today18', l: 'Сегодня, 18:00' }, { k: 'tomorrow10', l: 'Завтра, 10:00' }];
  const dueAt = () => { const d = new Date(); if (v.when === 'in1h') d.setHours(d.getHours() + 1, 0, 0, 0); else if (v.when === 'today18') d.setHours(18, 0, 0, 0); else { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); } return d.toISOString(); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) { setError('Введите название задачи'); return; }
    setBusy(true);
    try { await api.createTask({ title: v.title.trim(), type: v.type, dueAt: dueAt() }); ui.set({ quickCreate: null }); toast.success('Задача создана'); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Что сделать" required error={error}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!error} value={v.title} maxLength={200} onChange={(e) => { setV({ ...v, title: e.target.value }); setError(null); }} placeholder="Позвонить и подтвердить показ" />}</Field>
      <Field label="Тип">{(id) => <Select id={id} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as TaskType })}>{(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((t) => <option key={t} value={t}>{TASK_TYPE_LABEL[t]}</option>)}</Select>}</Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">Срок</legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p.k} type="button" aria-pressed={v.when === p.k} onClick={() => setV({ ...v, when: p.k })}
              className={cn('h-10 rounded-full border px-4 text-[14px] font-medium transition-colors duration-tab', v.when === p.k ? 'border-primary bg-primary-soft text-primary-text' : 'border-border bg-surface text-muted-foreground')}>{p.l}</button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2.5 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => ui.set({ quickCreate: 'menu' })}>Назад</Button>
        <Button type="submit" className="flex-[2]" loading={busy}>Создать задачу</Button>
      </div>
    </form>
  );
}
