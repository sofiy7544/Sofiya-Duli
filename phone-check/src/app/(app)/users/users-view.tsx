'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { ROLES, type Role } from '@/lib/types';
import { useUser } from '@/components/shell';
import { ErrorAlert, Spinner } from '@/components/ui';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}

const ROLE_HINT: Record<Role, string> = {
  admin: 'Admin — всё, включая пользователей и аудит',
  manager: 'Manager — загрузка, проверка, экспорт, правка карточек',
  viewer: 'Viewer — только просмотр результатов',
};

export function UsersView() {
  const me = useUser();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers((await api<{ users: UserRow[] }>('/api/users')).users);
    } catch (err) {
      setError(err);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: string, body: Record<string, unknown>, msg: string) => {
    setError(null);
    try {
      await api(`/api/users/${id}`, { method: 'PATCH', json: body });
      setNotice(msg);
      await load();
    } catch (err) {
      setError(err);
    }
  };

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    try {
      await api('/api/users', { method: 'POST', json: Object.fromEntries(f.entries()) });
      setCreating(false);
      setNotice('Пользователь создан');
      await load();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Пользователи</h1>
          <p>Роли определяют, кто может загружать файлы, подтверждать совпадения и видеть журнал.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating((v) => !v)}>
          <UserPlus size={15} /> Добавить
        </button>
      </div>
      <ErrorAlert error={error} />
      {notice && <div className="alert alert-info">{notice}</div>}

      {creating && (
        <form className="card card-pad" onSubmit={create} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div className="field">
            <label htmlFor="u-email">Email</label>
            <input id="u-email" name="email" type="email" className="input" required />
          </div>
          <div className="field">
            <label htmlFor="u-name">Имя</label>
            <input id="u-name" name="name" className="input" required maxLength={100} />
          </div>
          <div className="field">
            <label htmlFor="u-role">Роль</label>
            <select id="u-role" name="role" className="select" defaultValue="manager">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_HINT[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="u-pass">Временный пароль (от 12 символов)</label>
            <input id="u-pass" name="password" type="password" className="input" required minLength={12} autoComplete="new-password" />
          </div>
          <button className="btn btn-primary" type="submit">
            Создать
          </button>
        </form>
      )}

      <div className="card">
        {!users ? (
          <div className="empty">
            <Spinner />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Последняя активность</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 550 }}>{u.name}</div>
                      <div className="muted small">{u.email}</div>
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ width: 140 }}
                        value={u.role}
                        disabled={u.id === me.id}
                        aria-label={`Роль ${u.email}`}
                        onChange={(e) => patch(u.id, { role: e.target.value }, 'Роль изменена, сессии пользователя завершены')}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r[0]!.toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{u.isActive ? <span className="badge b-ok">Активен</span> : <span className="badge b-danger">Заблокирован</span>}</td>
                    <td className="muted">{fmtDateTime(u.lastSeenAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            const password = prompt('Новый пароль (от 12 символов, буквы и цифры)');
                            if (password) void patch(u.id, { password }, 'Пароль изменён');
                          }}
                        >
                          Сменить пароль
                        </button>
                        {u.id !== me.id && (
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-danger' : ''}`}
                            onClick={() => patch(u.id, { isActive: !u.isActive }, u.isActive ? 'Пользователь заблокирован' : 'Пользователь разблокирован')}
                          >
                            {u.isActive ? 'Заблокировать' : 'Разблокировать'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
