import * as React from 'react';
import { api } from '@/lib/mock/api';
import { store, users } from '@/lib/mock/store';
import { useRouter } from '@/lib/router';
import { PRIORITY_LABEL, PURPOSE_LABEL, SOURCE_LABEL } from '@/lib/labels';
import type { Priority, SourceType } from '@/lib/mock/types';
import { FormGrid, FormRow, FormSection, FormShell, useDirty } from '@/components/shell/form-shell';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PickerField } from '@/components/ui/picker';
import { toast } from '@/components/ui/toast';
import { tr } from '@/lib/i18n';

/**
 * /leads/new — LeadForm по SCREEN-MAP. В отличие от «быстрого захвата»
 * («молния»), здесь полная карточка: бюджет вилкой, цель покупки,
 * ответственный, объект интереса и первый шаг.
 */
type Purpose = keyof typeof PURPOSE_LABEL;
type Draft = {
  clientId: string; fullName: string; primaryPhone: string;
  priority: Priority; source: SourceType; purpose: Purpose; assignedUserId: string;
  budgetMin: string; budgetMax: string; propertyId: string; note: string;
};

const EMPTY: Draft = {
  clientId: '', fullName: '', primaryPhone: '+380 ', priority: 'warm', source: 'MANUAL',
  purpose: 'LIVING', assignedUserId: 'u1', budgetMin: '', budgetMax: '', propertyId: '', note: '',
};

const num = (s: string) => Number(s.replace(/[^\d]/g, '')) || undefined;

export function LeadFormScreen() {
  const router = useRouter();
  const clients = store.db.clients.filter((c) => !c.isArchived);
  const properties = store.db.properties;
  const { value: v, patch, dirty } = useDirty<Draft>(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Draft, string>>>({});

  const submit = async () => {
    const e: typeof errors = {};
    if (!v.clientId) {
      if (v.fullName.trim().length < 2) e.fullName = tr('Имя — минимум 2 символа');
      if (!/^[+0-9()\-\s]{6,32}$/.test(v.primaryPhone)) e.primaryPhone = tr('Телефон: 6–32 символа');
    }
    const min = num(v.budgetMin); const max = num(v.budgetMax);
    if (min && max && min > max) e.budgetMax = tr('Верхняя граница меньше нижней');
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const picked = clients.find((c) => c.id === v.clientId);
      const lead = await api.createLead({
        fullName: picked?.fullName ?? v.fullName.trim(),
        primaryPhone: picked?.primaryPhone ?? v.primaryPhone.trim(),
        priority: v.priority,
        budgetMax: max,
      });
      await api.updateLead(lead.id, { assignedUserId: v.assignedUserId });
      if (v.note.trim()) await api.addNote(lead.clientId, v.note.trim(), lead.id);
      toast.success(tr('Лид создан'));
      router.navigate(`/leads/${lead.id}`);
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <FormShell title={tr('Новый лид')} back="/leads" dirty={dirty} busy={busy}
      subtitle={tr('Полная карточка. Для звонка на ходу есть быстрый захват — «молния» в шапке.')}
      submitLabel={tr('Создать лид')} onSubmit={submit}>

      <FormSection title={tr('Клиент')}>
        <FormGrid>
          <FormRow>
            <PickerField label={tr('Из базы')} hint={tr('Или заполните имя и телефон ниже')} emptyLabel={tr('Новый клиент')}
              value={v.clientId} onChange={(clientId) => patch({ clientId })}
              options={clients.map((c) => ({ value: c.id, label: c.fullName, meta: c.primaryPhone }))} />
          </FormRow>
          {!v.clientId && (
            <>
              <Field label={tr('Имя и фамилия')} required error={errors.fullName}>
                {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.fullName} value={v.fullName}
                  onChange={(e) => patch({ fullName: e.target.value })} placeholder={tr('Ирина Савчук')} autoComplete="name" />}
              </Field>
              <Field label={tr('Телефон')} required error={errors.primaryPhone}>
                {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.primaryPhone} type="tel" inputMode="tel"
                  value={v.primaryPhone} onChange={(e) => patch({ primaryPhone: e.target.value })} placeholder="+380 67 123 45 67" />}
              </Field>
            </>
          )}
        </FormGrid>
      </FormSection>

      <FormSection title={tr('Запрос')}>
        <FormGrid>
          <Field label={tr('Бюджет от, €')}>
            {(fid) => <Input id={fid} inputMode="numeric" value={v.budgetMin} onChange={(e) => patch({ budgetMin: e.target.value })} placeholder="300 000" />}
          </Field>
          <Field label={tr('Бюджет до, €')} error={errors.budgetMax}>
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.budgetMax} inputMode="numeric"
              value={v.budgetMax} onChange={(e) => patch({ budgetMax: e.target.value })} placeholder="450 000" />}
          </Field>
          <Field label={tr('Цель')}>
            {(fid) => (
              <Select id={fid} value={v.purpose} onChange={(e) => patch({ purpose: e.target.value as Purpose })}>
                {(Object.keys(PURPOSE_LABEL) as Purpose[]).map((p) => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={tr('Приоритет')}>
            {(fid) => (
              <Select id={fid} value={v.priority} onChange={(e) => patch({ priority: e.target.value as Priority })}>
                {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={tr('Источник')}>
            {(fid) => (
              <Select id={fid} value={v.source} onChange={(e) => patch({ source: e.target.value as SourceType })}>
                {(Object.keys(SOURCE_LABEL) as SourceType[]).map((t) => <option key={t} value={t}>{SOURCE_LABEL[t]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={tr('Ответственный')}>
            {(fid) => (
              <Select id={fid} value={v.assignedUserId} onChange={(e) => patch({ assignedUserId: e.target.value })}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </Select>
            )}
          </Field>
          <FormRow>
            <PickerField label={tr('Объект интереса')} emptyLabel={tr('Пока не выбран')} searchPlaceholder={tr('Найти по названию или району')}
              value={v.propertyId} onChange={(propertyId) => patch({ propertyId })}
              options={properties.map((p) => ({ value: p.id, label: p.title, meta: p.district }))} />
          </FormRow>
          <FormRow>
            <Field label={tr('Первая заметка')}>
              {(fid) => <Textarea id={fid} rows={4} value={v.note} onChange={(e) => patch({ note: e.target.value })} placeholder={tr('О чём договорились на первом контакте')} />}
            </Field>
          </FormRow>
        </FormGrid>
      </FormSection>
    </FormShell>
  );
}
