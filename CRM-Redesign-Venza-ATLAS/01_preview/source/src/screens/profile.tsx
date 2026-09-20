import * as React from 'react';
import { currentUser } from '@/lib/mock/store';
import { PageBody, PageHeader } from '@/components/shell/page';
import { FormGrid, FormRow, FormSection, useDirty } from '@/components/shell/form-shell';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { toast } from '@/components/ui/toast';

/**
 * /profile — по SCREEN-MAP: личные данные + смена пароля, двумя отдельными
 * формами. Разделение намеренное: пароль сохраняется своей кнопкой и своими
 * проверками, чтобы случайная правка телефона не требовала текущего пароля.
 */
export function ProfileScreen() {
  const me = currentUser();
  const initial = React.useMemo(() => ({ fullName: me.fullName, email: me.email, phone: '+380 67 000 00 00' }), [me.fullName, me.email]);
  const { value: v, patch, dirty } = useDirty(initial);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<{ fullName?: string; email?: string }>({});

  const save = async () => {
    const e: typeof errors = {};
    if (v.fullName.trim().length < 2) e.fullName = 'Имя — минимум 2 символа';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) e.email = 'Проверьте адрес почты';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 450));
    setBusy(false);
    toast.success('Профиль сохранён');
  };

  return (
    <PageBody className="lg:max-w-[760px]">
      <PageHeader title="Профиль" back="/settings" subtitle="Как вас видят коллеги и клиенты" />

      <section className="surface p-4 lg:p-5">
        <div className="flex items-center gap-4">
          <Avatar name={v.fullName || me.fullName} size={64} />
          <div className="min-w-0">
            <p className="text-[15px] font-medium">{v.fullName || me.fullName}</p>
            <p className="t-caption mt-0.5">{me.role === 'ADMIN' ? 'Администратор' : 'Риелтор'}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => toast.message('Загрузка фото подключается в CRM')}>Сменить фото</Button>
          </div>
        </div>

        <FormSection title="Личные данные">
          <FormGrid>
            <FormRow>
              <Field label="Имя и фамилия" required error={errors.fullName}>
                {(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.fullName} value={v.fullName}
                  onChange={(e) => patch({ fullName: e.target.value })} autoComplete="name" />}
              </Field>
            </FormRow>
            <Field label="Рабочая почта" required error={errors.email}>
              {(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.email} type="email" inputMode="email"
                value={v.email} onChange={(e) => patch({ email: e.target.value })} />}
            </Field>
            <Field label="Телефон">
              {(id) => <Input id={id} type="tel" inputMode="tel" value={v.phone} onChange={(e) => patch({ phone: e.target.value })} />}
            </Field>
          </FormGrid>
        </FormSection>

        <div className="mt-5 flex justify-end">
          <Button loading={busy} disabled={!dirty} onClick={save}>Сохранить</Button>
        </div>
      </section>

      <PasswordCard />
    </PageBody>
  );
}

/** Смена пароля — отдельной карточкой и со своими проверками. */
function PasswordCard() {
  const [v, setV] = React.useState({ current: '', next: '', repeat: '' });
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof v, string>>>({});
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const e: typeof errors = {};
    if (!v.current) e.current = 'Введите текущий пароль';
    if (v.next.length < 8) e.next = 'Новый пароль — минимум 8 символов';
    if (v.next && v.next === v.current) e.next = 'Новый пароль совпадает с текущим';
    if (v.repeat !== v.next) e.repeat = 'Пароли не совпадают';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    setBusy(false);
    setV({ current: '', next: '', repeat: '' });
    toast.success('Пароль изменён');
  };

  return (
    <section className="surface mt-4 p-4 lg:p-5">
      <h2 className="t-h3 text-[15px]">Пароль</h2>
      <p className="t-caption mt-1">После смены остальные устройства попросят войти заново.</p>
      <div className="mt-3">
        <FormGrid>
          <FormRow>
            <Field label="Текущий пароль" error={errors.current}>
              {(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.current} type="password" autoComplete="current-password"
                value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} />}
            </Field>
          </FormRow>
          <Field label="Новый пароль" error={errors.next}>
            {(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.next} type="password" autoComplete="new-password"
              value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} />}
          </Field>
          <Field label="Ещё раз" error={errors.repeat}>
            {(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.repeat} type="password" autoComplete="new-password"
              value={v.repeat} onChange={(e) => setV({ ...v, repeat: e.target.value })} />}
          </Field>
        </FormGrid>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="outline" loading={busy} onClick={submit}>Сменить пароль</Button>
      </div>
    </section>
  );
}
