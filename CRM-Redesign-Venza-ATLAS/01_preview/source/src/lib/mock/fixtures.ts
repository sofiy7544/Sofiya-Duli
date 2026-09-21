import type { Activity, CalendarEvent, Client, Lead, Property, Task, User } from './types';

/**
 * Демо-база превью. Все люди, телефоны и почты выдуманы.
 *
 * Телефоны намеренно из диапазонов, которые не выдаются абонентам: во Франции
 * 06 39 98 xx xx зарезервирован ARCEP для кино и рекламы, в Британии
 * 07700 900xxx — Ofcom drama range, остальные страны набраны нулями. Так номер
 * выглядит настоящим на экране, но позвонить по нему нельзя. Почты — на домене
 * .demo, которого в интернете не существует.
 *
 * Даты считаются от текущего момента, чтобы «Сегодня» и календарь были живыми.
 */
const DAY = 86_400_000;
const HOUR = 3_600_000;
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
  { id: 'c1', fullName: 'Adrien Lacroix', primaryPhone: '+33 6 39 98 14 02', email: 'a.lacroix@mail.demo', type: 'BUYER', source: 'INSTAGRAM', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(41 * DAY),
    notes: 'Ищет дом для семьи: нужен вид на воду, терраса и парковка на две машины. Решение принимает вместе с женой.',
    preferences: { propertyType: 'HOUSE', districts: ['Villefranche-sur-Mer', 'Cap d’Ail'], rooms: { min: 4 }, price: { min: 3_500_000, max: 5_500_000 }, currency: 'EUR' } },
  { id: 'c2', fullName: 'Полина Верещагина', primaryPhone: '+380 67 000 24 18', email: 'p.vereshchagina@mail.demo', type: 'BUYER', source: 'REFERRAL', assignedUserId: 'u2', isArchived: false, isBlacklisted: false, createdAt: ago(24 * DAY),
    notes: 'Вышла по рекомендации от Мирославы Бойко. Торгуется, но решение принимает быстро.',
    preferences: { propertyType: 'APARTMENT', districts: ['Cap d’Ail', 'Monaco border'], rooms: { min: 2, max: 3 }, price: { max: 1_800_000 }, currency: 'EUR' } },
  { id: 'c3', fullName: 'Tomas Iversen', primaryPhone: '+45 32 00 04 71', type: 'INVESTOR', source: 'WEBSITE', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(19 * DAY),
    notes: 'Инвестиция под аренду, доходность от 4%. Управление объектом хочет передать агентству.',
    preferences: { propertyType: 'APARTMENT', districts: ['Nice', 'Menton'], price: { max: 900_000 }, currency: 'EUR' } },
  { id: 'c4', fullName: 'Beatrice Lombardi', primaryPhone: '+39 351 000 42 16', email: 'b.lombardi@mail.demo', type: 'BUYER', source: 'FACEBOOK', assignedUserId: 'u3', isArchived: false, isBlacklisted: false, createdAt: ago(10 * DAY),
    preferences: { districts: ['Sanremo'], rooms: { min: 3 }, price: { max: 1_200_000 }, currency: 'EUR' } },
  { id: 'c5', fullName: 'Артём Загорулько', primaryPhone: '+380 63 000 11 45', type: 'BUYER', source: 'TELEGRAM', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(7 * DAY),
    notes: 'Первый разговор был коротким: просил прислать варианты и перезвонить вечером.',
    preferences: { propertyType: 'APARTMENT', districts: ['Menton'], rooms: { min: 2 }, price: { max: 750_000 }, currency: 'EUR' } },
  { id: 'c6', fullName: 'Nadia Haddad', primaryPhone: '+33 6 39 98 27 50', type: 'BUYER', source: 'MANUAL', assignedUserId: 'u2', isArchived: false, isBlacklisted: false, createdAt: ago(3 * DAY) },
  { id: 'c7', fullName: 'Мирослава Бойко', primaryPhone: '+380 50 000 33 09', email: 'm.boiko@mail.demo', type: 'SELLER', source: 'REFERRAL', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(72 * DAY),
    notes: 'Продала квартиру в Лугано, довольна сделкой. Рекомендует агентство знакомым.' },
  { id: 'c8', fullName: 'Jonas Weber', primaryPhone: '+49 151 0000 084', type: 'BUYER', source: 'INSTAGRAM', assignedUserId: 'u3', isArchived: false, isBlacklisted: false, createdAt: ago(13 * DAY),
    preferences: { propertyType: 'APARTMENT', districts: ['Nice'], price: { min: 400_000, max: 600_000 }, currency: 'EUR' } },
  { id: 'c9', fullName: 'Chiara Rinaldi', primaryPhone: '+39 351 000 18 73', email: 'c.rinaldi@mail.demo', type: 'BUYER', source: 'WEBSITE', assignedUserId: 'u2', isArchived: false, isBlacklisted: false, createdAt: ago(2 * DAY) },
  { id: 'c10', fullName: 'Радмила Тарасенко', primaryPhone: '+380 95 000 62 27', type: 'INVESTOR', source: 'REFERRAL', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(33 * DAY),
    notes: 'Смотрит коммерцию с действующим арендатором. Наличные, сделка без ипотеки.',
    preferences: { propertyType: 'COMMERCIAL', districts: ['Beaulieu-sur-Mer', 'Nice'], price: { min: 800_000, max: 2_000_000 }, currency: 'EUR' } },
  { id: 'c11', fullName: 'Philippe Martel', primaryPhone: '+33 6 39 98 55 31', type: 'BUYER', source: 'FACEBOOK', assignedUserId: 'u3', isArchived: true, isBlacklisted: false, createdAt: ago(124 * DAY),
    notes: 'Архив: купил через другое агентство, просил не беспокоить до следующего года.' },
  { id: 'c12', fullName: 'Ihor Panasenko', primaryPhone: '+380 66 000 70 12', type: 'BUYER', source: 'MANUAL', assignedUserId: null, isArchived: false, isBlacklisted: true, createdAt: ago(98 * DAY),
    notes: 'Чёрный список: сорвал три показа подряд и грубил риелтору.' },
  { id: 'c13', fullName: 'Олег и Дарья Крыловы', primaryPhone: '+380 67 000 48 36', email: 'krylovy@mail.demo', type: 'BUYER', source: 'INSTAGRAM', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(DAY),
    notes: 'Переезд с двумя детьми к сентябрю. Нужна школа в пешей доступности и тихая улица.',
    preferences: { propertyType: 'HOUSE', districts: ['Èze', 'Beaulieu-sur-Mer'], rooms: { min: 4 }, price: { max: 2_900_000 }, currency: 'EUR' } },
  { id: 'c14', fullName: 'Sofia Almeida', primaryPhone: '+351 910 000 244', email: 's.almeida@mail.demo', type: 'SELLER', source: 'WEBSITE', assignedUserId: 'u2', isArchived: false, isBlacklisted: false, createdAt: ago(28 * DAY),
    notes: 'Продаёт студию в Ментоне. Готова на торг до 5%, если покупатель без ипотеки.' },
  { id: 'c15', fullName: 'Владислав Гринько', primaryPhone: '+380 67 000 91 54', type: 'BUYER', source: 'TELEGRAM', assignedUserId: 'u3', isArchived: false, isBlacklisted: false, createdAt: ago(16 * DAY),
    preferences: { propertyType: 'APARTMENT', districts: ['Nice', 'Cap d’Ail'], rooms: { min: 3 }, price: { max: 2_100_000 }, currency: 'EUR' } },
  { id: 'c16', fullName: 'Marta Kowalczyk', primaryPhone: '+48 500 000 137', email: 'm.kowalczyk@mail.demo', type: 'INVESTOR', source: 'REFERRAL', assignedUserId: 'u2', isArchived: false, isBlacklisted: false, createdAt: ago(52 * DAY),
    notes: 'Берёт участки под застройку. Просит присылать всё, что выходит с разрешением на строительство.',
    preferences: { propertyType: 'LAND', districts: ['Roquebrune-Cap-Martin'], price: { max: 2_200_000 }, currency: 'EUR' } },
  { id: 'c17', fullName: 'Léa Dumont', primaryPhone: '+33 6 39 98 61 24', type: 'BUYER', source: 'WEBSITE', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: ago(4 * HOUR) },
  { id: 'c18', fullName: 'James Holloway', primaryPhone: '+44 7700 900418', email: 'j.holloway@mail.demo', type: 'BUYER', source: 'INSTAGRAM', assignedUserId: 'u3', isArchived: false, isBlacklisted: false, createdAt: ago(9 * DAY),
    preferences: { propertyType: 'APARTMENT', districts: ['Sanremo', 'Menton'], rooms: { min: 2 }, price: { max: 800_000 }, currency: 'EUR' } },
];

/* art — индекс фотографии в src/assets/photos (порядок по имени файла).
   10 — студия с кирпичной стеной, 11 — фасад дома, 12 — вид сверху на набережную,
   13 — гостиная с кирпичом, 14 — бассейн во дворе. */
export const properties: Property[] = [
  { id: 'p1', type: 'HOUSE', status: 'AVAILABLE', title: 'Вилла с панорамой залива', district: 'Villefranche-sur-Mer', address: '675 Av. des Caroubiers', rooms: 5, area: 280, price: 4_900_000, currency: 'EUR', ownerUserId: 'u1',
    description: 'Вилла расположена в престижном районе с панорамным видом на залив. На первом уровне — просторная гостиная с выходом на террасу, кухня-столовая и гостевая спальня. На втором — четыре спальни, каждая со своей ванной. Сад 900 м², бассейн, гараж на две машины.',
    photos: [{ id: 'ph1', art: 0 }, { id: 'ph2', art: 6 }, { id: 'ph3', art: 13 }, { id: 'ph4', art: 7 }], features: ['Вид на море', 'Бассейн', 'Гараж', 'Сад 900 м²'], createdAt: ago(60 * DAY) },
  { id: 'p2', type: 'APARTMENT', status: 'IN_SHOWING', title: 'Апартаменты у набережной', district: 'Cap d’Ail', address: '12 Bd de la Mer', rooms: 3, floor: 4, totalFloors: 6, area: 118, price: 1_650_000, currency: 'EUR', ownerUserId: 'u2',
    description: 'Светлые апартаменты в резиденции у набережной, пять минут пешком до Монако. Две спальни, гостиная с лоджией, консьерж и подземный паркинг. Во дворе резиденции — бассейн и зона отдыха.',
    photos: [{ id: 'ph5', art: 14 }, { id: 'ph6', art: 2 }, { id: 'ph7', art: 8 }], features: ['Консьерж', 'Бассейн', 'Паркинг'], createdAt: ago(35 * DAY) },
  { id: 'p3', type: 'APARTMENT', status: 'AVAILABLE', title: 'Студия с кирпичной стеной', district: 'Menton', address: '4 Rue Partouneaux', rooms: 1, floor: 2, totalFloors: 5, area: 42, price: 390_000, currency: 'EUR', ownerUserId: 'u1',
    description: 'Компактная студия после ремонта: кирпичная стена, дубовый пол, встроенная кухня. Подходит под сдачу в аренду — рядом набережная и вокзал.',
    photos: [{ id: 'ph8', art: 10 }, { id: 'ph9', art: 9 }], features: ['После ремонта', 'Под аренду'], createdAt: ago(20 * DAY) },
  { id: 'p4', type: 'HOUSE', status: 'RESERVED', title: 'Дом в оливковой роще', district: 'Èze', address: 'Chemin des Oliviers 8', rooms: 4, area: 210, price: 2_750_000, currency: 'EUR', ownerUserId: 'u3',
    description: 'Каменный дом среди оливковых деревьев, 10 минут до пляжа. Отреставрирован в 2022 году: новая кровля, окна и инженерия.',
    photos: [{ id: 'ph10', art: 11 }, { id: 'ph11', art: 3 }, { id: 'ph12', art: 4 }], features: ['Реставрация 2022', 'Сад', 'Камин'], createdAt: ago(48 * DAY) },
  { id: 'p5', type: 'APARTMENT', status: 'AVAILABLE', title: 'Пентхаус на Promenade', district: 'Nice', address: '88 Promenade des Anglais', rooms: 4, floor: 9, totalFloors: 9, area: 186, price: 3_200_000, currency: 'EUR', ownerUserId: 'u2',
    description: 'Пентхаус с террасой по периметру и прямым видом на набережную. Два санузла, гардеробная, место в подземном паркинге.',
    photos: [{ id: 'ph13', art: 12 }, { id: 'ph14', art: 7 }, { id: 'ph15', art: 2 }], features: ['Терраса 90 м²', 'Вид на море', 'Лифт'], createdAt: ago(15 * DAY) },
  { id: 'p6', type: 'APARTMENT', status: 'AVAILABLE', title: 'Квартира в старом городе', district: 'Sanremo', address: 'Via Palazzo 31', rooms: 3, floor: 3, totalFloors: 4, area: 96, price: 540_000, currency: 'EUR', ownerUserId: 'u3',
    description: 'Квартира с высокими потолками в доме XIX века, в двух шагах от моря. Кирпичная кладка в гостиной сохранена при ремонте.',
    photos: [{ id: 'ph16', art: 13 }, { id: 'ph17', art: 5 }], features: ['Потолки 3,6 м', 'Исторический дом'], createdAt: ago(8 * DAY) },
  { id: 'p7', type: 'COMMERCIAL', status: 'AVAILABLE', title: 'Бутик на первой линии', district: 'Beaulieu-sur-Mer', address: '2 Bd Maréchal Leclerc', area: 74, price: 980_000, currency: 'EUR', ownerUserId: 'u1',
    description: 'Коммерческое помещение с витринами на набережную, действующий арендатор с договором до 2028 года.', photos: [{ id: 'ph18', art: 4 }], features: ['Арендатор до 2028', 'Витрины'], createdAt: ago(27 * DAY) },
  { id: 'p8', type: 'LAND', status: 'AVAILABLE', title: 'Участок под виллу', district: 'Roquebrune-Cap-Martin', address: 'Av. Winston Churchill', area: 1400, price: 1_950_000, currency: 'EUR', ownerUserId: 'u2',
    description: 'Участок с разрешением на строительство виллы 300 м², вид на мыс. Коммуникации подведены.', photos: [{ id: 'ph19', art: 6 }], features: ['Разрешение на стройку', 'Вид на мыс'], createdAt: ago(40 * DAY) },
  { id: 'p9', type: 'APARTMENT', status: 'SOLD', title: 'Апартаменты в Лугано', district: 'Lugano', address: 'Riva Paradiso 5', rooms: 3, floor: 5, totalFloors: 7, area: 124, price: 1_420_000, currency: 'CHF', ownerUserId: 'u1',
    description: 'Апартаменты с видом на озеро. Продано в этом квартале.', photos: [{ id: 'ph20', art: 1 }], features: ['Вид на озеро'], createdAt: ago(90 * DAY) },
];

export const leads: Lead[] = [
  { id: 'l1', clientId: 'c1', stage: 'SHOWING', priority: 'hot', assignedUserId: 'u1', source: 'INSTAGRAM', purpose: 'LIVING', budgetMin: 3_500_000, budgetMax: 5_500_000, budgetCurrency: 'EUR', interestPropertyId: 'p1', interestNote: 'Второй показ с супругой', nextActionAt: at(0, 16, 30), lastContactAt: ago(DAY), createdAt: ago(41 * DAY) },
  { id: 'l2', clientId: 'c2', stage: 'NEGOTIATION', priority: 'hot', assignedUserId: 'u2', source: 'REFERRAL', purpose: 'LIVING', budgetMax: 1_800_000, budgetCurrency: 'EUR', interestPropertyId: 'p2', interestNote: 'Торг по цене и сроку выхода на сделку', nextActionAt: at(0, 12), lastContactAt: ago(3 * HOUR), createdAt: ago(24 * DAY) },
  { id: 'l3', clientId: 'c3', stage: 'SELECTION', priority: 'warm', assignedUserId: 'u1', source: 'WEBSITE', purpose: 'INVESTMENT', budgetMax: 900_000, budgetCurrency: 'EUR', interestPropertyId: 'p3', nextActionAt: at(-1, 11), lastContactAt: ago(4 * DAY), createdAt: ago(19 * DAY) },
  { id: 'l4', clientId: 'c4', stage: 'QUALIFIED', priority: 'warm', assignedUserId: 'u3', source: 'FACEBOOK', purpose: 'RELOCATION', budgetMax: 1_200_000, budgetCurrency: 'EUR', nextActionAt: at(1, 10), lastContactAt: ago(2 * DAY), createdAt: ago(10 * DAY) },
  { id: 'l5', clientId: 'c5', stage: 'CONTACTED', priority: 'cold', assignedUserId: 'u1', source: 'TELEGRAM', purpose: 'LIVING', budgetMax: 750_000, budgetCurrency: 'EUR', nextActionAt: at(0, 18), lastContactAt: ago(6 * DAY), createdAt: ago(7 * DAY) },
  { id: 'l6', clientId: 'c6', stage: 'NEW', priority: 'warm', assignedUserId: null, source: 'MANUAL', purpose: 'LIVING', budgetCurrency: 'EUR', createdAt: ago(3 * DAY) },
  { id: 'l7', clientId: 'c8', stage: 'NEW', priority: 'hot', assignedUserId: 'u3', source: 'INSTAGRAM', purpose: 'INVESTMENT', budgetMin: 400_000, budgetMax: 600_000, budgetCurrency: 'EUR', nextActionAt: at(0, 9, 30), createdAt: ago(5 * HOUR) },
  { id: 'l8', clientId: 'c9', stage: 'NEW', priority: 'warm', assignedUserId: 'u2', source: 'WEBSITE', purpose: 'LIVING', budgetMax: 3_400_000, budgetCurrency: 'EUR', interestPropertyId: 'p5', createdAt: ago(2 * HOUR) },
  { id: 'l9', clientId: 'c10', stage: 'QUALIFIED', priority: 'warm', assignedUserId: 'u1', source: 'REFERRAL', purpose: 'INVESTMENT', budgetMin: 800_000, budgetMax: 2_000_000, budgetCurrency: 'EUR', interestPropertyId: 'p7', nextActionAt: at(2, 15), lastContactAt: ago(DAY), createdAt: ago(33 * DAY) },
  { id: 'l10', clientId: 'c13', stage: 'CONTACTED', priority: 'hot', assignedUserId: 'u1', source: 'INSTAGRAM', purpose: 'RELOCATION', budgetMax: 2_900_000, budgetCurrency: 'EUR', interestPropertyId: 'p4', interestNote: 'Школа рядом — обязательное условие', nextActionAt: at(0, 14), lastContactAt: ago(20 * HOUR), createdAt: ago(DAY) },
  { id: 'l11', clientId: 'c7', stage: 'WON', priority: 'warm', assignedUserId: 'u1', source: 'REFERRAL', purpose: 'LIVING', budgetCurrency: 'CHF', interestPropertyId: 'p9', createdAt: ago(72 * DAY) },
  { id: 'l12', clientId: 'c11', stage: 'LOST', priority: 'cold', assignedUserId: 'u3', source: 'FACEBOOK', purpose: 'LIVING', budgetCurrency: 'EUR', lostReason: 'Купил через другое агентство', createdAt: ago(124 * DAY) },
  { id: 'l13', clientId: 'c15', stage: 'SELECTION', priority: 'hot', assignedUserId: 'u3', source: 'TELEGRAM', purpose: 'LIVING', budgetMax: 2_100_000, budgetCurrency: 'EUR', interestPropertyId: 'p2', interestNote: 'Просит подборку из трёх вариантов к пятнице', nextActionAt: at(1, 13), lastContactAt: ago(2 * DAY), createdAt: ago(16 * DAY) },
  { id: 'l14', clientId: 'c16', stage: 'SHOWING', priority: 'warm', assignedUserId: 'u2', source: 'REFERRAL', purpose: 'INVESTMENT', budgetMax: 2_200_000, budgetCurrency: 'EUR', interestPropertyId: 'p8', nextActionAt: at(3, 11), lastContactAt: ago(5 * DAY), createdAt: ago(52 * DAY) },
  { id: 'l15', clientId: 'c17', stage: 'NEW', priority: 'warm', assignedUserId: 'u1', source: 'WEBSITE', purpose: 'LIVING', budgetCurrency: 'EUR', createdAt: ago(4 * HOUR) },
  { id: 'l16', clientId: 'c18', stage: 'CONTACTED', priority: 'warm', assignedUserId: 'u3', source: 'INSTAGRAM', purpose: 'INVESTMENT', budgetMax: 800_000, budgetCurrency: 'EUR', interestPropertyId: 'p6', nextActionAt: at(4, 12), lastContactAt: ago(3 * DAY), createdAt: ago(9 * DAY) },
];

export const tasks: Task[] = [
  { id: 't1', title: 'Подтвердить время второго показа', type: 'CALL', dueAt: at(0, 15, 30), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 't2', title: 'Отправить подборку в Ницце', type: 'FOLLOWUP', dueAt: at(-1, 17), userId: 'u1', clientId: 'c3', leadId: 'l3' },
  { id: 't3', title: 'Подготовить встречное предложение', type: 'CUSTOM', dueAt: at(0, 13), userId: 'u2', clientId: 'c2', leadId: 'l2' },
  { id: 't4', title: 'Показ дома в Эзе', type: 'SHOWING', dueAt: at(0, 14), userId: 'u1', clientId: 'c13', leadId: 'l10' },
  { id: 't5', title: 'Уточнить бюджет и сроки переезда', type: 'CALL', dueAt: at(0, 18), userId: 'u1', clientId: 'c5', leadId: 'l5' },
  { id: 't6', title: 'Запросить документы у продавца', type: 'CUSTOM', dueAt: at(1, 11), userId: 'u1', clientId: 'c14' },
  { id: 't7', title: 'Написать новому лиду с сайта', type: 'FOLLOWUP', dueAt: at(0, 9, 30), userId: 'u3', clientId: 'c8', leadId: 'l7', completedAt: ago(30 * 60_000) },
  { id: 't8', title: 'Согласовать время показа студии', type: 'CALL', dueAt: at(2, 12), userId: 'u1', clientId: 'c3', leadId: 'l3' },
  { id: 't9', title: 'Собрать три варианта к пятнице', type: 'CUSTOM', dueAt: at(1, 13), userId: 'u3', clientId: 'c15', leadId: 'l13' },
  { id: 't10', title: 'Перезвонить по участку в Рокбрюне', type: 'CALL', dueAt: at(-2, 16), userId: 'u2', clientId: 'c16', leadId: 'l14' },
  { id: 't11', title: 'Отправить договор на согласование', type: 'FOLLOWUP', dueAt: at(2, 10), userId: 'u2', clientId: 'c2', leadId: 'l2' },
  { id: 't12', title: 'Проверить статус арендатора бутика', type: 'CUSTOM', dueAt: at(3, 15), userId: 'u1', clientId: 'c10', leadId: 'l9' },
  { id: 't13', title: 'Поздравить с закрытием сделки', type: 'FOLLOWUP', dueAt: at(-3, 12), userId: 'u1', clientId: 'c7', leadId: 'l11', completedAt: ago(3 * DAY) },
  { id: 't14', title: 'Ответить на заявку с сайта', type: 'CALL', dueAt: at(0, 11), userId: 'u1', clientId: 'c17', leadId: 'l15' },
];

export const events: CalendarEvent[] = [
  { id: 'e1', kind: 'CALL', title: 'Звонок: второй показ', startsAt: at(0, 10), endsAt: at(0, 10, 15), clientId: 'c1', userId: 'u1' },
  { id: 'e2', kind: 'MEETING', title: 'Встреча с продавцом', startsAt: at(0, 11, 30), endsAt: at(0, 12, 30), clientId: 'c14', userId: 'u1' },
  { id: 'e3', kind: 'SHOWING', title: 'Показ: дом в оливковой роще', startsAt: at(0, 14), endsAt: at(0, 15), clientId: 'c13', propertyId: 'p4', userId: 'u1' },
  { id: 'e4', kind: 'SHOWING', title: 'Показ: вилла с панорамой', startsAt: at(0, 16, 30), endsAt: at(0, 17, 30), clientId: 'c1', propertyId: 'p1', userId: 'u1' },
  { id: 'e5', kind: 'DEADLINE', title: 'Оферта по Cap d’Ail', startsAt: at(1, 12), endsAt: at(1, 12, 30), clientId: 'c2', propertyId: 'p2', userId: 'u2', readOnly: true },
  { id: 'e6', kind: 'SHOWING', title: 'Показ: пентхаус на Promenade', startsAt: at(1, 15), endsAt: at(1, 16), clientId: 'c9', propertyId: 'p5', userId: 'u2' },
  { id: 'e7', kind: 'CONTRACT', title: 'Подписание: дом в Эзе', startsAt: at(2, 11), endsAt: at(2, 12), propertyId: 'p4', userId: 'u3', readOnly: true },
  { id: 'e8', kind: 'CALL', title: 'Звонок инвестору', startsAt: at(2, 15), endsAt: at(2, 15, 30), clientId: 'c10', userId: 'u1' },
  { id: 'e9', kind: 'PAYMENT', title: 'Комиссия по сделке', startsAt: at(3, 10), endsAt: at(3, 10, 30), userId: 'u1', readOnly: true },
  { id: 'e10', kind: 'MEETING', title: 'Планёрка агентства', startsAt: at(-1, 9), endsAt: at(-1, 10), userId: 'u1' },
  { id: 'e11', kind: 'SHOWING', title: 'Показ: квартира в Сан-Ремо', startsAt: at(4, 13), endsAt: at(4, 14), clientId: 'c18', propertyId: 'p6', userId: 'u3' },
  { id: 'e12', kind: 'SHOWING', title: 'Показ: участок в Рокбрюне', startsAt: at(3, 11), endsAt: at(3, 12), clientId: 'c16', propertyId: 'p8', userId: 'u2' },
  { id: 'e13', kind: 'MEETING', title: 'Подбор вариантов с клиентом', startsAt: at(1, 13), endsAt: at(1, 14), clientId: 'c15', userId: 'u3' },
  { id: 'e14', kind: 'CALL', title: 'Заявка с сайта: первый контакт', startsAt: at(0, 11), endsAt: at(0, 11, 20), clientId: 'c17', userId: 'u1' },
];

export const activities: Activity[] = [
  { id: 'a1', type: 'CREATED', text: 'Новый лид с сайта', at: ago(2 * HOUR), userId: 'u2', clientId: 'c9', leadId: 'l8' },
  { id: 'a2', type: 'STAGE', text: 'Этап: Переговоры', at: ago(3 * HOUR), userId: 'u2', clientId: 'c2', leadId: 'l2' },
  { id: 'a3', type: 'CALL', text: 'Звонок: отвечен. Хотят второй показ с супругой в 16:30.', at: ago(20 * HOUR), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 'a4', type: 'NOTE', text: 'Семья переезжает с двумя детьми, важна школа в пешей доступности.', at: ago(22 * HOUR), userId: 'u1', clientId: 'c13', leadId: 'l10' },
  { id: 'a5', type: 'SHOWING', text: 'Показ виллы в Villefranche прошёл хорошо, понравилась терраса.', at: ago(DAY + 5 * HOUR), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 'a6', type: 'TASK', text: 'Задача выполнена: написать новому лиду', at: ago(30 * 60_000), userId: 'u3', clientId: 'c8', leadId: 'l7' },
  { id: 'a7', type: 'STAGE', text: 'Этап: Показ', at: ago(2 * DAY), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 'a8', type: 'NOTE', text: 'Первичный звонок: бюджет до 5,5 млн, нужен вид на воду.', at: ago(6 * DAY), userId: 'u1', clientId: 'c1', leadId: 'l1' },
  { id: 'a9', type: 'CALL', text: 'Звонок: нет ответа. Перезвонить вечером.', at: ago(6 * DAY), userId: 'u1', clientId: 'c5', leadId: 'l5' },
  { id: 'a10', type: 'CREATED', text: 'Заявка с сайта: форма «Подобрать объект»', at: ago(4 * HOUR), userId: 'u1', clientId: 'c17', leadId: 'l15' },
  { id: 'a11', type: 'NOTE', text: 'Инвестор просит объекты только с действующим арендатором.', at: ago(DAY), userId: 'u1', clientId: 'c10', leadId: 'l9' },
  { id: 'a12', type: 'STAGE', text: 'Этап: Подбор', at: ago(2 * DAY), userId: 'u3', clientId: 'c15', leadId: 'l13' },
];
