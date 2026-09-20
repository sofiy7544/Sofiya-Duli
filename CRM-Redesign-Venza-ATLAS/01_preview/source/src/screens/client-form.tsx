import * as React from 'react';
import { api } from '@/lib/mock/api';
import { store, users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { useRouter } from '@/lib/router';
import { CLIENT_TYPE_LABEL, PROPERTY_TYPE_LABEL, SOURCE_LABEL } from '@/lib/labels';
import type { Client, ClientType, PropertyType, SourceType } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { FormGrid, FormRow, FormSection, FormShell, useDirty } from '@/components/shell/form-shell';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state';
import { toast } from '@/components/ui/toast';

/**
 * /clients/new и /clients/:id/edit — ClientForm по SCREEN-MAP.
 * Одна форма на оба случая: поля и проверки совпадают, отличается только
 * заголовок и то, куда уходит сохранение.
 */
type Draft = {
  fullName: string; primaryPhone: string; email: string;
  type: ClientType; source: SourceType; assignedUserId: string;
  propertyType: PropertyType | ''; districts: string; budgetMax: string; notes: string;
};

const EMPTY: Draft = {
  fullName: '', primaryPhone: '+380 ', email: '', type: 'BUYER', source: 'MANUAL',
  assignedUserId: 'u1', propertyType: '', districts: '', budgetMax: '', notes: '',
};

const toDraft = (c: Client): Draft => ({
  fullName: c.fullName, primaryPhone: c.primaryPhone, email: c.email ?? '',
  type: c.type, source: c.source, assignedUserId: c.assignedUserId ?? 'u1',
  propertyType: c.preferences?.propertyType ?? '',
  districts: (c.preferences?.districts ?? []).join(', '),
  budgetMax: c.preferences?.price?.max ? String(c.preferences.price.max) : '',
  notes: c.notes ?? '',
});

export function ClientFormScreen({ id }: { id?: string }) {
  const router = useRouter();
  const existing = id ? store.db.clients.find((c) => c.id === id) : undefined;
  const r = useResource(() => (id ? api.client(id) : Promise.resolve(null)), [id]);
  const initial = React.useMemo(() => (existing ? toDraft(existing) : EMPTY), [existing]);
  const { value: v, patch, dirty } = useDirty<Draft>(initial);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Draft, string>>>({});

  const back = id ? `/clients/${id}` : '/clients';

  if (id && r.error) return <PageBody className="lg:max-w-[760px]"><PageHeader title="Клиент" back="/clients" /><ErrorState error={r.error} onRetry={r.retry} what="клиента" /></PageBody>;
  if (id && r.loading && !existing) return <PageBody className="lg:max-w-[760px]"><PageHeader title="Клиент" back="/clients" /><Skeleton className="h-96" /></PageBody>;

  const submit = async () => {
    const e: typeof errors = {};
    if (v.fullName.trim().length < 2) e.fullName = 'Имя — минимум 2 символа';
    if (!/^[+0-9()\-\s]{6,32}$/.test(v.primaryPhone)) e.primaryPhone = 'Телефон: 6–32 символа, цифры, +, скобки и дефис';
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) e.email = 'Проверьте адрес почты';
    setErrors(e);
    if (Object.keys(e).length) return;

    const max = Number(v.budgetMax.replace(/[^\d]/g, '')) || undefined;
    const preferences = {
      propertyType: v.propertyType || undefined,
      districts: v.districts.split(',').map((d) => d.trim()).filter(Boolean),
      price: max ? { max } : undefined,
      currency: existing?.preferences?.currency ?? 'EUR',
    };
    const payload = {
      fullName: v.fullName.trim(), primaryPhone: v.primaryPhone.trim(), email: v.email.trim() || undefined,
      type: v.type, source: v.source, assignedUserId: v.assignedUserId, notes: v.notes.trim() || undefined, preferences,
    };

    setBusy(true);
    try {
      if (id) { await api.updateClient(id, payload); toast.success('Клиент сохранён'); router.navigate(`/clients/${id}`); }
      else { const c = await api.createClient(payload); toast.success('Клиент добавлен'); router.navigate(`/clients/${c.id}`); }
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <FormShell title={id ? 'Правка клиента' : 'Новый клиент'} back={back} dirty={dirty} busy={busy}
      subtitle={id ? undefined : 'Контакт и пожелания. Остальное дозаполните позже.'}
      submitLabel={id ? 'Сохранить' : 'Создать клиента'} onSubmit={submit}>

      <FormSection title="Контакт">
        <FormGrid>
          <FormRow>
            <Field label="Имя и фамилия" required error={errors.fullName}>
              {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.fullName} value={v.fullName}
                onChange={(e) => patch({ fullName: e.target.value })} placeholder="Ирина Ковальчук" autoComplete="name" />}
            </Field>
          </FormRow>
          <Field label="Телефон" required error={errors.primaryPhone}>
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.primaryPhone} type="tel" inputMode="tel"
              value={v.primaryPhone} onChange={(e) => patch({ primaryPhone: e.target.value })} placeholder="+380 67 123 45 67" />}
          </Field>
          <Field label="Почта" error={errors.email}>
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.email} type="email" inputMode="email"
              value={v.email} onChange={(e) => patch({ email: e.target.value })} placeholder="name@example.com" />}
          </Field>
          <Field label="Тип клиента">
            {(fid) => (
              <Select id={fid} value={v.type} onChange={(e) => patch({ type: e.target.value as ClientType })}>
                {(Object.keys(CLIENT_TYPE_LABEL) as ClientType[]).map((t) => <option key={t} value={t}>{CLIENT_TYPE_LABEL[t]}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Источник">
            {(fid) => (
              <Select id={fid} value={v.source} onChange={(e) => patch({ source: e.target.value as SourceType })}>
                {(Object.keys(SOURCE_LABEL) as SourceType[]).map((t) => <option key={t} value={t}>{SOURCE_LABEL[t]}</option>)}
              </Select>
            )}
          </Field>
          <FormRow>
            <Field label="Ответственный">
              {(fid) => (
                <Select id={fid} value={v.assignedUserId} onChange={(e) => patch({ assignedUserId: e.target.value })}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </Select>
              )}
            </Field>
          </FormRow>
        </FormGrid>
      </FormSection>

      <FormSection title="Пожелания">
        <FormGrid>
          <Field label="Тип объекта">
            {(fid) => (
              <Select id={fid} value={v.propertyType} onChange={(e) => patch({ propertyType: e.target.value as PropertyType | '' })}>
                <option value="">Не важно</option>
                {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Бюджет до, €">
            {(fid) => <Input id={fid} inputMode="numeric" value={v.budgetMax} onChange={(e) => patch({ budgetMax: e.target.value })} placeholder="450 000" />}
          </Field>
          <FormRow>
            <Field label="Районы" hint="Через запятую">
              {(fid, d) => <Input id={fid} aria-describedby={d} value={v.districts} onChange={(e) => patch({ districts: e.target.value })} placeholder="Набережная, Центр" />}
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Заметка">
              {(fid) => <Textarea id={fid} rows={4} value={v.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Что важно помнить о клиенте" />}
            </Field>
          </FormRow>
        </FormGrid>
      </FormSection>
    </FormShell>
  );
}
