import type { Activity, CalendarEvent, Client, Lead, Property, Task, User } from './types';

/** Все данные вымышленные. Даты считаются от текущего момента, чтобы «Сегодня» и календарь были живыми. */
const DAY = 86_400_000;
const now = new Date();
const at = (dayOffset: number, h: number, m = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

export const CURRENT_USER_ID = 'u1';

export const users: User[] = [
  { id: 'u1', fullName: 'Анна Потапова', role: 'ADMIN', email: 'anna@agency.demo' },
  { id: 'u2', fullName: 'Marco Zaccaria', role: 'REALTOR', email: 'marco@agency.demo' },
  { id: 'u3', fullName: 'Сергей Лисовой', role: 'REALTOR', email: 'sergey@agency.demo' },
];

export const clients: Client[] = [
  { id: 'c1', fullName: 'Вячеслав Милан', primaryPhone: '+38067 214 55 90', email: 'v.milan@mail.demo', type: 'BUYER', source: 'INSTAGRAM', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(40 * DAY),
    notes: 'Ищет виллу с видом на море для семьи. Важны терраса и парковка на 2 машины.',
    preferences: { propertyType: 'HOUSE', districts: ['Villefranche-sur-Mer', 'Cap d’Ail'], rooms: { min: 4 }, price: { min: 3_500_000, max: 5_500_000 }, currency: 'EUR' } },
  { id: 'c2', fullName: 'Elena Garkusha', primaryPhone: '+33 6 12 44 81 07', email: 'elena.g@mail.demo', type: 'BUYER', source: 'REFERRAL', assignedUserId: 'u2', isArchived: false, isBlacklisted: false, createdAt: ago(22 * DAY),
    preferences: { propertyType: 'APARTMENT', districts: ['Cap d’Ail', 'Monaco border'], rooms: { min: 2, max: 3 }, price: { max: 1_800_000 }, currency: 'EUR' } },
  { id: 'c3', fullName: 'Nataliia Dovzhenko', primaryPhone: '+38050 118 42 70', type: 'INVESTOR', source: 'WEBSITE', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(18 * DAY),
    notes: 'Инвестиция под аренду, доходность от 4%.', preferences: { propertyType: 'APARTMENT', districts: ['Nice', 'Menton'], price: { max: 900_000 }, currency: 'EUR' } },
  { id: 'c4', fullName: 'Irina Praga', primaryPhone: '+420 777 310 928', type: 'BUYER', source: 'FACEBOOK', assignedUserId: 'u3', isArchived: false, isBlacklisted: false, createdAt: ago(9 * DAY),
    preferences: { districts: ['Sanremo'], rooms: { min: 3 }, price: { max: 1_200_000 }, currency: 'EUR' } },
  { id: 'c5', fullName: 'Олег Бондаренко', primaryPhone: '+38063 904 17 33', type: 'BUYER', source: 'TELEGRAM', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(6 * DAY),
    preferences: { propertyType: 'APARTMENT', districts: ['Menton'], rooms: { min: 2 }, price: { max: 750_000 }, currency: 'EUR' } },
  { id: 'c6', fullName: 'Ruslan Shapirov', primaryPhone: '+41 79 551 20 64', type: 'BUYER', source: 'MANUAL', assignedUserId: 'u2', isArchived: false, isBlacklisted: false, createdAt: ago(3 * DAY) },
  { id: 'c7', fullName: 'Katerina Turchaninova', primaryPhone: '+38067 002 71 18', type: 'SELLER', source: 'REFERRAL', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(70 * DAY) },
  { id: 'c8', fullName: 'Максим Дорош', primaryPhone: '+38095 330 12 48', type: 'BUYER', source: 'INSTAGRAM', assignedUserId: 'u3', isArchived: false, isBlacklisted: false, createdAt: ago(12 * DAY) },
  { id: 'c9', fullName: 'Giulia Ferraresi', primaryPhone: '+39 347 118 2290', email: 'giulia.f@mail.demo', type: 'BUYER', source: 'WEBSITE', assignedUserId: 'u2', isArchived: false, isBlacklisted: false, createdAt: ago(2 * DAY) },
  { id: 'c10', fullName: 'Daniil Ostapchuk', primaryPhone: '+48 512 090 443', type: 'INVESTOR', source: 'REFERRAL', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(31 * DAY) },
  { id: 'c11', fullName: 'Светлана Коваль', primaryPhone: '+38066 771 02 19', type: 'BUYER', source: 'FACEBOOK', assignedUserId: 'u3', isArchived: true, isBlacklisted: false, createdAt: ago(120 * DAY) },
  { id: 'c12', fullName: 'Viktor Ambrosov', primaryPhone: '+33 7 81 22 04 55', type: 'BUYER', source: 'MANUAL', assignedUserId: null, isArchived: false, isBlacklisted: true, createdAt: ago(95 * DAY) },
  { id: 'c13', fullName: 'Евгений и Елена Сомовы', primaryPhone: '+38067 480 33 61', type: 'BUYER', source: 'INSTAGRAM', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(1 * DAY),
    notes: 'Переезд с детьми, нужна школа рядом.', preferences: { propertyType: 'HOUSE', districts: ['Èze', 'Beaulieu-sur-Mer'], rooms: { min: 4 }, price: { max: 2_900_000 }, currency: 'EUR' } },
];

export const properties: Property[] = [
  { id: 'p1', type: 'HOUSE', status: 'AVAILABLE', title: 'Вилла с панорамой залива', district: 'Villefranche-sur-Mer', address: '675 Av. des Caroubiers', rooms: 5, area: 280, price: 4_900_000, currency: 'EUR', ownerUserId: 'u1',
    description: 'Вилла расположена в престижном районе с панорамным видом на залив. На первом уровне — просторная гостиная с выходом на террасу, кухня-столовая и гостевая спальня. На втором — четыре спальни, каждая со своей ванной. Сад 900 м², бассейн, гараж на две машины.',
    photos: [{ id: 'ph1', art: 0 }, { id: 'ph2', art: 6 }, { id: 'ph3', art: 1 }, { id: 'ph4', art: 7 }], features: ['Вид на море', 'Бассейн', 'Гараж', 'Сад 900 м²'], createdAt: ago(60 * DAY) },
  { id: 'p2', type: 'APARTMENT', status: 'IN_SHOWING', title: 'Апартаменты у набережной', district: 'Cap d’Ail', address: '12 Bd de la Mer', rooms: 3, floor: 4, totalFloors: 6, area: 118, price: 1_650_000, currency: 'EUR', ownerUserId: 'u2',
    description: 'Светлые апартаменты в резиденции у набережной, пять минут пешком до Монако. Две спальни, гостиная с лоджией, консьерж и подземный паркинг.',
    photos: [{ id: 'ph5', art: 2 }, { id: 'ph6', art: 1 }, { id: 'ph7', art: 8 }], features: ['Консьерж', 'Лоджия', 'Паркинг'], createdAt: ago(35 * DAY) },
  { id: 'p3', type: 'APARTMENT', status: 'AVAILABLE', title: 'Студия с террасой', district: 'Menton', address: '4 Rue Partouneaux', rooms: 1, floor: 2, totalFloors: 5, area: 42, price: 390_000, currency: 'EUR', ownerUserId: 'u1',
    description: 'Компактная студия с солнечной террасой в историческом центре. Подходит под сдачу в аренду.', photos: [{ id: 'ph8', art: 5 }, { id: 'ph9', art: 9 }], features: ['Терраса', 'Под аренду'], createdAt: ago(20 * DAY) },
  { id: 'p4', type: 'HOUSE', status: 'RESERVED', title: 'Дом в оливковой роще', district: 'Èze', address: 'Chemin des Oliviers 8', rooms: 4, area: 210, price: 2_750_000, currency: 'EUR', ownerUserId: 'u3',
    description: 'Каменный дом среди оливковых деревьев, 10 минут до пляжа. Отреставрирован в 2022 году.', photos: [{ id: 'ph10', art: 3 }, { id: 'ph11', art: 4 }], features: ['Реставрация 2022', 'Сад', 'Камин'], createdAt: ago(48 * DAY) },
  { id: 'p5', type: 'APARTMENT', status: 'AVAILABLE', title: 'Пентхаус на Promenade', district: 'Nice', address: '88 Promenade des Anglais', rooms: 4, floor: 9, totalFloors: 9, area: 186, price: 3_200_000, currency: 'EUR', ownerUserId: 'u2',
    description: 'Пентхаус с террасой по периметру и прямым видом на Английскую набережную.', photos: [{ id: 'ph12', art: 7 }, { id: 'ph13', art: 2 }, { id: 'ph14', art: 4 }], features: ['Терраса 90 м²', 'Вид на море', 'Лифт'], createdAt: ago(15 * DAY) },
  { id: 'p6', type: 'APARTMENT', status: 'AVAILABLE', title: 'Квартира в старом городе', district: 'Sanremo', address: 'Via Palazzo 31', rooms: 3, floor: 3, totalFloors: 4, area: 96, price: 540_000, currency: 'EUR', ownerUserId: 'u3',
    description: 'Квартира с высокими потолками и фресками XIX века, в двух шагах от моря.', photos: [{ id: 'ph15', art: 1 }], features: ['Потолки 3,6 м', 'Исторический дом'], createdAt: ago(8 * DAY) },
  { id: 'p7', type: 'COMMERCIAL', status: 'AVAILABLE', title: 'Бутик на первой линии', district: 'Beaulieu-sur-Mer', address: '2 Bd Maréchal Leclerc', area: 74, price: 980_000, currency: 'EUR', ownerUserId: 'u1',
    description: 'Коммерческое помещение с витринами на набережную, действующий арендатор.', photos: [{ id: 'ph16', art: 4 }], features: ['Арендатор', 'Витрины'], createdAt: ago(27 * DAY) },
  { id: 'p8', type: 'LAND', status: 'AVAILABLE', title: 'Участок под виллу', district: 'Roquebrune-Cap-Martin', address: 'Av. Winston Churchill', area: 1400, price: 1_950_000, currency: 'EUR', ownerUserId: 'u2',
    description: 'Участок с разрешением на строительство виллы 300 м², вид на мыс.', photos: [{ id: 'ph17', art: 6 }], features: ['Разрешение на стройку', 'Вид на мыс'], createdAt: ago(40 * DAY) },
  { id: 'p9', type: 'APARTMENT', status: 'SOLD', title: 'Апартаменты в Лугано', district: 'Lugano', address: 'Riva Paradiso 5', rooms: 3, floor: 5, totalFloors: 7, area: 124, price: 1_420_000, currency: 'CHF', ownerUserId: 'u1',
    description: 'Апартаменты с видом на озеро.', photos: [{ id: 'ph18', art: 2 }], features: ['Вид на озеро'], createdAt: ago(90 * DAY) },
];

export const leads: Lead[] = [
  { id: 'l1', clientId: 'c1', stage: 'SHOWING', priority: 'hot', assignedUserId: 'u1', source: 'INSTAGRAM', purpose: 'LIVING', budgetMin: 3_500_000, budgetMax: 5_500_000, budgetCurrency: 'EUR', interestPropertyId: 'p1', interestNote: 'Второй показ с супругой', nextActionAt: at(0, 16, 30), lastContactAt: ago(DAY), createdAt: ago(40 * DAY) },
  { id: 'l2', clientId: 'c2', stage: 'NEGOTIATION', priority: 'hot', assignedUserId: 'u2', source: 'REFERRAL', purpose: 'LIVING', budgetMax: 1_800_000, budgetCurrency: 'EUR', interestPropertyId: 'p2', nextActionAt: at(0, 12), lastContactAt: ago(3 * 3_600_000), createdAt: ago(22 * DAY) },
  { id: 'l3', clientId: 'c3', stage: 'SELECTION', priority: 'warm', assignedUserId: 'u1', source: 'WEBSITE', purpose: 'INVESTMENT', budgetMax: 900_000, budgetCurrency: 'EUR', interestPropertyId: 'p3', nextActionAt: at(-1, 11), lastContactAt: ago(4 * DAY), createdAt: ago(18 * DAY) },
  { id: 'l4', clientId: 'c4', stage: 'QUALIFIED', priority: 'warm', assignedUserId: 'u3', source: 'FACEBOOK', purpose: 'RELOCATION', budgetMax: 1_200_000, budgetCurrency: 'EUR', nextActionAt: at(1, 10), lastContactAt: ago(2 * DAY), createdAt: ago(9 * DAY) },
  { id: 'l5', clientId: 'c5', stage: 'CONTACTED', priority: 'cold', assignedUserId: 'u1', source: 'TELEGRAM', purpose: 'LIVING', budgetMax: 750_000, budgetCurrency: 'EUR', nextActionAt: at(0, 18), lastContactAt: ago(6 * DAY), createdAt: ago(6 * DAY) },
  { id: 'l6', clientId: 'c6', stage: 'NEW', priority: 'warm', assignedUserId: null, source: 'MANUAL', purpose: 'LIVING', budgetCurrency: 'EUR', createdAt: ago(3 * DAY) },
  { id: 'l7', clientId: 'c8', stage: 'NEW', priority: 'hot', assignedUserId: 'u3', source: 'INSTAGRAM', purpose: 'INVESTMENT', budgetMin: 400_000, budgetMax: 600_000, budgetCurrency: 'EUR', nextActionAt: at(0, 9, 30), createdAt: ago(5 * 3_600_000) },
  { id: 'l8', clientId: 'c9', stage: 'NEW', priority: 'warm', assignedUserId: 'u2', source: 'WEBSITE', purpose: 'LIVING', budgetMax: 3_400_000, budgetCurrency: 'EUR', interestPropertyId: 'p5', createdAt: ago(2 * 3_600_000) },
  { id: 'l9', clientId: 'c10', stage: 'QUALIFIED', priority: 'warm', assignedUserId: 'u1', source: 'REFERRAL', purpose: 'INVESTMENT', budgetMin: 800_000, budgetMax: 2_000_000, budgetCurrency: 'EUR', interestPropertyId: 'p7', nextActionAt: at(2, 15), lastContactAt: ago(DAY), createdAt: ago(31 * DAY) },
  { id: 'l10', clientId: 'c13', stage: 'CONTACTED', priority: 'hot', assignedUserId: 'u1', source: 'INSTAGRAM', purpose: 'RELOCATION', budgetMax: 2_900_000, budgetCurrency: 'EUR', interestPropertyId: 'p4', nextActionAt: at(0, 14), lastContactAt: ago(20 * 3_600_000), createdAt: ago(DAY) },
  { id: 'l11', clientId: 'c7', stage: 'WON', priority: 'warm', assignedUserId: 'u1', source: 'REFERRAL', purpose: 'LIVING', budgetCurrency: 'EUR', createdAt: ago(70 * DAY) },
  { id: 'l12', clientId: 'c11', stage: 'LOST', priority: 'cold', assignedUserId: 'u3', source: 'FACEBOOK', purpose: 'LIVING', budgetCurrency: 'EUR', lostReason: 'Купил через другое агентство', createdAt: ago(120 * DAY) },
];

export const tasks: Task[] = [
  { id: 't1', title: 'Подтвердить время второго показа', type: 'CALL', dueAt: at(0, 15, 30), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 't2', title: 'Отправить подборку в Ницце', type: 'FOLLOWUP', dueAt: at(-1, 17), userId: 'u1', clientId: 'c3', leadId: 'l3' },
  { id: 't3', title: 'Подготовить встречное предложение', type: 'CUSTOM', dueAt: at(0, 13), userId: 'u2', clientId: 'c2', leadId: 'l2' },
  { id: 't4', title: 'Показ дома в Эзе', type: 'SHOWING', dueAt: at(0, 14), userId: 'u1', clientId: 'c13', leadId: 'l10' },
  { id: 't5', title: 'Уточнить бюджет и сроки переезда', type: 'CALL', dueAt: at(0, 18), userId: 'u1', clientId: 'c5', leadId: 'l5' },
  { id: 't6', title: 'Запросить документы у продавца', type: 'CUSTOM', dueAt: at(1, 11), userId: 'u1', clientId: 'c7' },
  { id: 't7', title: 'Написать новому лиду с сайта', type: 'FOLLOWUP', dueAt: at(0, 9, 30), userId: 'u3', clientId: 'c8', leadId: 'l7', completedAt: ago(1_800_000) },
  { id: 't8', title: 'Согласовать время показа студии', type: 'CALL', dueAt: at(2, 12), userId: 'u1', clientId: 'c3' },
];

export const events: CalendarEvent[] = [
  { id: 'e1', kind: 'CALL', title: 'Звонок: второй показ', startsAt: at(0, 10), endsAt: at(0, 10, 15), clientId: 'c1', userId: 'u1' },
  { id: 'e2', kind: 'MEETING', title: 'Встреча с продавцом', startsAt: at(0, 11, 30), endsAt: at(0, 12, 30), clientId: 'c7', userId: 'u1' },
  { id: 'e3', kind: 'SHOWING', title: 'Показ: дом в оливковой роще', startsAt: at(0, 14), endsAt: at(0, 15), clientId: 'c13', propertyId: 'p4', userId: 'u1' },
  { id: 'e4', kind: 'SHOWING', title: 'Показ: вилла с панорамой', startsAt: at(0, 16, 30), endsAt: at(0, 17, 30), clientId: 'c1', propertyId: 'p1', userId: 'u1' },
  { id: 'e5', kind: 'DEADLINE', title: 'Оферта по Cap d’Ail', startsAt: at(1, 12), endsAt: at(1, 12, 30), clientId: 'c2', propertyId: 'p2', userId: 'u2', readOnly: true },
  { id: 'e6', kind: 'SHOWING', title: 'Показ: пентхаус на Promenade', startsAt: at(1, 15), endsAt: at(1, 16), clientId: 'c9', propertyId: 'p5', userId: 'u2' },
  { id: 'e7', kind: 'CONTRACT', title: 'Подписание: дом в Эзе', startsAt: at(2, 11), endsAt: at(2, 12), propertyId: 'p4', userId: 'u3', readOnly: true },
  { id: 'e8', kind: 'CALL', title: 'Звонок инвестору', startsAt: at(2, 15), endsAt: at(2, 15, 30), clientId: 'c10', userId: 'u1' },
  { id: 'e9', kind: 'PAYMENT', title: 'Комиссия по сделке', startsAt: at(3, 10), endsAt: at(3, 10, 30), userId: 'u1', readOnly: true },
  { id: 'e10', kind: 'MEETING', title: 'Планёрка агентства', startsAt: at(-1, 9), endsAt: at(-1, 10), userId: 'u1' },
  { id: 'e11', kind: 'SHOWING', title: 'Показ: квартира в Сан-Ремо', startsAt: at(4, 13), endsAt: at(4, 14), clientId: 'c4', propertyId: 'p6', userId: 'u3' },
];

export const activities: Activity[] = [
  { id: 'a1', type: 'CREATED', text: 'Новый лид с сайта', at: ago(2 * 3_600_000), userId: 'u2', clientId: 'c9', leadId: 'l8' },
  { id: 'a2', type: 'STAGE', text: 'Этап: Переговоры', at: ago(3 * 3_600_000), userId: 'u2', clientId: 'c2', leadId: 'l2' },
  { id: 'a3', type: 'CALL', text: 'Звонок: отвечен. Хотят второй показ с супругой в 16:30.', at: ago(20 * 3_600_000), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 'a4', type: 'NOTE', text: 'Семья переезжает с детьми, важна школа в пешей доступности.', at: ago(22 * 3_600_000), userId: 'u1', clientId: 'c13', leadId: 'l10' },
  { id: 'a5', type: 'SHOWING', text: 'Показ виллы в Villefranche прошёл хорошо, понравилась терраса.', at: ago(DAY + 5 * 3_600_000), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 'a6', type: 'TASK', text: 'Задача выполнена: написать новому лиду', at: ago(1_800_000), userId: 'u3', clientId: 'c8', leadId: 'l7' },
  { id: 'a7', type: 'STAGE', text: 'Этап: Показ', at: ago(2 * DAY), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 'a8', type: 'NOTE', text: 'Первичный звонок: бюджет до 5,5 млн, нужен вид на море.', at: ago(6 * DAY), userId: 'u1', clientId: 'c1', leadId: 'l1' },
];
