import * as React from 'react';
import { api } from '@/lib/mock/api';
import { store, users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { useRouter } from '@/lib/router';
import { PROPERTY_STATUS_LABEL, PROPERTY_TYPE_LABEL } from '@/lib/labels';
import type { Property, PropertyStatus, PropertyType } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { FormGrid, FormRow, FormSection, FormShell, useDirty } from '@/components/shell/form-shell';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state';
import { toast } from '@/components/ui/toast';

/**
 * /properties/new и /properties/:id/edit — PropertyForm по SCREEN-MAP.
 * Фото здесь не загружаются: в CRM это отдельный экран PropertyPhotos
 * с загрузкой, обложкой и порядком.
 */
type Draft = {
  title: string; type: PropertyType; status: PropertyStatus;
  district: string; address: string; rooms: string; floor: string; totalFloors: string;
  area: string; price: string; currency: string; ownerUserId: string;
  description: string; features: string;
};

const EMPTY: Draft = {
  title: '', type: 'APARTMENT', status: 'AVAILABLE', district: '', address: '',
  rooms: '', floor: '', totalFloors: '', area: '', price: '', currency: 'EUR',
  ownerUserId: 'u1', description: '', features: '',
};

const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || undefined;

const toDraft = (p: Property): Draft => ({
  title: p.title, type: p.type, status: p.status, district: p.district, address: p.address,
  rooms: p.rooms ? String(p.rooms) : '', floor: p.floor ? String(p.floor) : '',
  totalFloors: p.totalFloors ? String(p.totalFloors) : '',
  area: String(p.area), price: String(p.price), currency: p.currency,
  ownerUserId: p.ownerUserId, description: p.description, features: p.features.join(', '),
});

export function PropertyFormScreen({ id }: { id?: string }) {
  const router = useRouter();
  const existing = id ? store.db.properties.find((p) => p.id === id) : undefined;
  const r = useResource(() => (id ? api.property(id) : Promise.resolve(null)), [id]);
  const initial = React.useMemo(() => (existing ? toDraft(existing) : EMPTY), [existing]);
  const { value: v, patch, dirty } = useDirty<Draft>(initial);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Draft, string>>>({});

  const back = id ? `/properties/${id}` : '/properties';

  if (id && r.error) return <PageBody className="lg:max-w-[760px]"><PageHeader title="Объект" back="/properties" /><ErrorState error={r.error} onRetry={r.retry} what="объект" /></PageBody>;
  if (id && r.loading && !existing) return <PageBody className="lg:max-w-[760px]"><PageHeader title="Объект" back="/properties" /><Skeleton className="h-96" /></PageBody>;

  const submit = async () => {
    const e: typeof errors = {};
    if (v.title.trim().length < 3) e.title = 'Название — минимум 3 символа';
    if (!v.district.trim()) e.district = 'Укажите район';
    if (!v.address.trim()) e.address = 'Укажите адрес';
    if (!(num(v.area) ?? 0)) e.area = 'Площадь больше нуля';
    if (!(num(v.price) ?? 0)) e.price = 'Цена больше нуля';
    setErrors(e);
    if (Object.keys(e).length) return;

    const payload = {
      title: v.title.trim(), type: v.type, status: v.status,
      district: v.district.trim(), address: v.address.trim(),
      rooms: num(v.rooms), floor: num(v.floor), totalFloors: num(v.totalFloors),
      area: num(v.area)!, price: num(v.price)!, currency: v.currency,
      ownerUserId: v.ownerUserId, description: v.description.trim(),
      features: v.features.split(',').map((f) => f.trim()).filter(Boolean),
    };

    setBusy(true);
    try {
      if (id) { await api.updateProperty(id, payload); toast.success('Объект сохранён'); router.navigate(`/properties/${id}`); }
      else { const p = await api.createProperty(payload); toast.success('Объект добавлен'); router.navigate(`/properties/${p.id}`); }
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <FormShell title={id ? 'Правка объекта' : 'Новый объект'} back={back} dirty={dirty} busy={busy}
      subtitle={id ? undefined : 'Главное для публикации. Фото добавляются на странице объекта.'}
      submitLabel={id ? 'Сохранить' : 'Создать объект'} onSubmit={submit}>

      <FormSection title="Основное">
        <FormGrid>
          <FormRow>
            <Field label="Название" required error={errors.title}>
              {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.title} value={v.title}
                onChange={(e) => patch({ title: e.target.value })} placeholder="Двухкомнатная на набережной" />}
            </Field>
          </FormRow>
          <Field label="Тип">
            {(fid) => (
              <Select id={fid} value={v.type} onChange={(e) => patch({ type: e.target.value as PropertyType })}>
                {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Статус">
            {(fid) => (
              <Select id={fid} value={v.status} onChange={(e) => patch({ status: e.target.value as PropertyStatus })}>
                {(Object.keys(PROPERTY_STATUS_LABEL) as PropertyStatus[]).map((t) => <option key={t} value={t}>{PROPERTY_STATUS_LABEL[t]}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Район" required error={errors.district}>
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.district} value={v.district}
              onChange={(e) => patch({ district: e.target.value })} placeholder="Набережная" />}
          </Field>
          <Field label="Адрес" required error={errors.address}>
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.address} value={v.address}
              onChange={(e) => patch({ address: e.target.value })} placeholder="ул. Приморская, 14" />}
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Параметры">
        <FormGrid>
          <Field label="Площадь, м²" required error={errors.area}>
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.area} inputMode="decimal"
              value={v.area} onChange={(e) => patch({ area: e.target.value })} placeholder="72" />}
          </Field>
          <Field label="Комнат">
            {(fid) => <Input id={fid} inputMode="numeric" value={v.rooms} onChange={(e) => patch({ rooms: e.target.value })} placeholder="2" />}
          </Field>
          <Field label="Этаж">
            {(fid) => <Input id={fid} inputMode="numeric" value={v.floor} onChange={(e) => patch({ floor: e.target.value })} placeholder="4" />}
          </Field>
          <Field label="Этажей в доме">
            {(fid) => <Input id={fid} inputMode="numeric" value={v.totalFloors} onChange={(e) => patch({ totalFloors: e.target.value })} placeholder="9" />}
          </Field>
          <Field label="Цена" required error={errors.price}>
            {(fid, d) => <Input id={fid} aria-describedby={d} invalid={!!errors.price} inputMode="numeric"
              value={v.price} onChange={(e) => patch({ price: e.target.value })} placeholder="450 000" />}
          </Field>
          <Field label="Валюта">
            {(fid) => (
              <Select id={fid} value={v.currency} onChange={(e) => patch({ currency: e.target.value })}>
                {['EUR', 'USD', 'CHF', 'UAH'].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            )}
          </Field>
          <FormRow>
            <Field label="Ответственный">
              {(fid) => (
                <Select id={fid} value={v.ownerUserId} onChange={(e) => patch({ ownerUserId: e.target.value })}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </Select>
              )}
            </Field>
          </FormRow>
        </FormGrid>
      </FormSection>

      <FormSection title="Описание">
        <FormGrid>
          <FormRow>
            <Field label="Особенности" hint="Через запятую: терраса, паркинг, вид на море">
              {(fid, d) => <Input id={fid} aria-describedby={d} value={v.features} onChange={(e) => patch({ features: e.target.value })} placeholder="терраса, паркинг" />}
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Текст объявления">
              {(fid) => <Textarea id={fid} rows={6} value={v.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Что показать клиенту в первую очередь" />}
            </Field>
          </FormRow>
        </FormGrid>
      </FormSection>
    </FormShell>
  );
}
