/**
 * Данные агентства за год: 40 сотрудников и то, что они накапливают за 250 рабочих дней.
 * Генератор детерминированный (свой ГПСЧ), поэтому прогоны сравнимы между собой.
 * Выполняется внутри страницы через page.evaluate.
 */
export const fillYear = (seed, nLeads) => {
  const api = window.__crm;
  if (!api) return { ошибка: 'store не выставлен — превью собрано в проде?' };
  const { store, users } = api;

  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  const FIRST = ['Анна','Марина','Оксана','Ольга','Ирина','Наталья','Юлия','Дарья','Софія','Вікторія','Marco','Luca','Matteo','Andrea','Giulia','Chiara','Pierre','Camille','Julien','Claire','Thomas','Antoine','Sophie','Émilie','Hans','Greta','Jonas','Lena','Артём','Богдан','Кирило','Олег','Тарас','Роман','Павло','Микита','Данило','Захар','Нікіта','Влад'];
  const LAST = ['Ковальська','Радович','Дорош','Гриценко','Мельник','Савчук','Ткаченко','Лисенко','Бондар','Кравець','Brunelli','Ferretti','Moretti','Ricci','Costa','Marino','Dubois','Laurent','Moreau','Girard','Fontaine','Roux','Weber','Schmidt','Becker','Hoffmann','Кузьменко','Панченко','Левченко','Мороз','Шевчук','Поліщук','Бойко','Гончар','Романюк','Захарчук','Литвин','Сидор','Ярема','Клименко'];

  // 40 сотрудников: три «родных» плюс 37 сгенерированных
  const staff = users.map((u) => u.id);
  for (let i = users.length; i < 40; i++) {
    const id = `u${i + 1}`;
    users.push({ id, fullName: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`, role: i < 4 ? 'MANAGER' : 'REALTOR', email: `u${i + 1}@agency.demo` });
    staff.push(id);
  }

  const STAGES = ['NEW','CONTACT','QUALIFICATION','SELECTION','SHOWING','NEGOTIATION','WON','LOST'];
  const SOURCES = ['INSTAGRAM','WEBSITE','REFERRAL','FACEBOOK','TELEGRAM','MANUAL'];
  const TYPES = ['BUYER','SELLER','INVESTOR','TENANT'];
  const DAY = 86400000;
  const now = Date.now();
  const ago = (d) => new Date(now - d * DAY).toISOString();

  const clients = [], leads = [], tasks = [], events = [], activities = [];
  const N_LEADS = nLeads || 5000;

  for (let i = 0; i < N_LEADS; i++) {
    const cid = `yc${i}`, lid = `yl${i}`;
    const born = int(1, 360);                       // когда пришёл лид, дней назад
    const owner = pick(staff);
    clients.push({
      id: cid, fullName: `${pick(FIRST)} ${pick(LAST)}`,
      primaryPhone: `+33 6 39 98 ${String(int(10, 99))} ${String(int(10, 99))}`,
      email: rnd() < 0.6 ? `c${i}@mail.demo` : undefined,
      type: pick(TYPES), source: pick(SOURCES), assignedUserId: owner,
      isArchived: rnd() < 0.08, isBlacklisted: rnd() < 0.01, createdAt: ago(born),
      preferences: { price: { max: int(3, 60) * 100000 }, currency: 'EUR' },
    });
    const stage = pick(STAGES);
    leads.push({
      id: lid, clientId: cid, stage, priority: pick(['hot','warm','cold']), assignedUserId: owner,
      source: pick(SOURCES), purpose: pick(['LIVING','INVESTMENT','RELOCATION']),
      budgetMax: int(3, 60) * 100000, budgetCurrency: 'EUR', createdAt: ago(born),
      lastContactAt: ago(Math.max(0, born - int(0, 20))),
      lostReason: stage === 'LOST' ? 'Не подошёл бюджет' : undefined,
    });
    // задачи: 4 на лид
    for (let t = 0; t < 4; t++) {
      const due = born - int(0, born);
      tasks.push({ id: `yt${i}_${t}`, title: pick(['Перезвонить','Отправить подборку','Подтвердить показ','Уточнить бюджет','Подготовить договор']),
        type: pick(['CALL','SHOWING','FOLLOWUP','TASK']), dueAt: ago(due), userId: owner, clientId: cid, leadId: lid,
        completedAt: rnd() < 0.75 ? ago(Math.max(0, due - 1)) : null });
    }
    // события: 3 на лид
    for (let e = 0; e < 3; e++) {
      const at = new Date(now - (born - int(0, born)) * DAY);
      at.setHours(int(9, 18), pick([0, 30]), 0, 0);
      events.push({ id: `ye${i}_${e}`, kind: pick(['SHOWING','MEETING','CALL']), title: `Показ ${i}-${e}`,
        startsAt: at.toISOString(), endsAt: new Date(at.getTime() + 3600000).toISOString(),
        clientId: cid, userId: owner });
    }
    // активность: 10 на лид
    for (let a = 0; a < 10; a++) {
      activities.push({ id: `ya${i}_${a}`, type: pick(['CALL','NOTE','STAGE','SHOWING']),
        text: 'Звонок: отвечен. Договорились о показе.', at: ago(Math.max(0, born - int(0, born))),
        userId: owner, clientId: cid, leadId: lid });
    }
  }

  // объекты: агентство за год выставляет несколько сотен
  const props = [];
  for (let i = 0; i < 600; i++) {
    props.push({ id: `yp${i}`, title: `Объект ${i}`, district: pick(['Nice','Menton','Èze','Cap d’Ail','Sanremo']),
      address: `rue ${i}`, type: pick(['APARTMENT','HOUSE','LAND','COMMERCIAL']), status: pick(['ACTIVE','RESERVED','SOLD']),
      price: int(3, 60) * 100000, currency: 'EUR', area: int(30, 320), rooms: int(1, 7),
      ownerUserId: pick(staff), createdAt: ago(int(1, 360)), description: 'Демонстрационный объект.',
      features: ['Терраса'], photos: [{ id: `yph${i}`, art: i % 47 }] });
  }

  store.mutate((d) => {
    d.properties.push(...props);
    d.clients.push(...clients); d.leads.push(...leads);
    d.tasks.push(...tasks); d.events.push(...events); d.activities.push(...activities);
  });

  const db = store.db;
  return { сотрудников: users.length, объектов: db.properties.length, клиентов: db.clients.length, лидов: db.leads.length,
    задач: db.tasks.length, событий: db.events.length, активностей: db.activities.length };
};
