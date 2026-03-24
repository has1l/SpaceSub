export type SubscriptionCategory =
  | 'Развлечения'
  | 'Музыка'
  | 'Продуктивность'
  | 'Облако и хостинг'
  | 'Безопасность'
  | 'Образование'
  | 'Игры'
  | 'Фитнес'
  | 'Новости'
  | 'Подписки'
  | 'Супермаркеты'
  | 'Переводы'
  | 'Цифровые услуги'
  | 'Инвестиции'
  | 'Транспорт'
  | 'Рестораны'
  | 'Здоровье'
  | 'Другое';

/** Level 1 — exact lowercase merchant name lookup */
const MERCHANT_LOOKUP: Record<string, SubscriptionCategory> = {
  netflix: 'Развлечения',
  'нетфликс': 'Развлечения',
  youtube: 'Развлечения',
  'ютуб': 'Развлечения',
  'youtube premium': 'Развлечения',
  kinopoisk: 'Развлечения',
  кинопоиск: 'Развлечения',
  'яндекс.кино': 'Развлечения',
  okko: 'Развлечения',
  иви: 'Развлечения',
  ivi: 'Развлечения',
  amediateka: 'Развлечения',
  spotify: 'Музыка',
  'яндекс.музыка': 'Музыка',
  'yandex music': 'Музыка',
  apple: 'Музыка',
  'apple music': 'Музыка',
  vk: 'Музыка',
  'вк музыка': 'Музыка',
  deezer: 'Музыка',
  adobe: 'Продуктивность',
  microsoft: 'Продуктивность',
  office: 'Продуктивность',
  notion: 'Продуктивность',
  figma: 'Продуктивность',
  slack: 'Продуктивность',
  zoom: 'Продуктивность',
  '1password': 'Безопасность',
  lastpass: 'Безопасность',
  nordvpn: 'Безопасность',
  expressvpn: 'Безопасность',
  kaspersky: 'Безопасность',
  'каспарский': 'Безопасность',
  aws: 'Облако и хостинг',
  'amazon web services': 'Облако и хостинг',
  gcp: 'Облако и хостинг',
  azure: 'Облако и хостинг',
  digitalocean: 'Облако и хостинг',
  github: 'Облако и хостинг',
  gitlab: 'Облако и хостинг',
  vercel: 'Облако и хостинг',
  heroku: 'Облако и хостинг',
  coursera: 'Образование',
  udemy: 'Образование',
  stepik: 'Образование',
  skillbox: 'Образование',
  яндекс: 'Образование',
  'яндекс практикум': 'Образование',
  steam: 'Игры',
  playstation: 'Игры',
  'xbox game pass': 'Игры',
  'ea play': 'Игры',
  readymag: 'Продуктивность',
  canva: 'Продуктивность',
};

/** Level 2 — regex pattern matching */
const PATTERN_MAP: Array<[RegExp, SubscriptionCategory]> = [
  [/netflix|кино|cinema|film|video|tv\b|телев|okko|amedia|ivi\b/i, 'Развлечения'],
  [/music|musik|музык|spotify|deezer|soundcloud/i, 'Музыка'],
  [/cloud|хостинг|hosting|server|сервер|storage|хранилище/i, 'Облако и хостинг'],
  [/vpn|antivirus|антивирус|security|защит|firewall/i, 'Безопасность'],
  [/adobe|office|notion|figma|slack|zoom|trello|jira|confluence/i, 'Продуктивность'],
  [/course|курс|learn|обуч|education|академия|academy|school|школ/i, 'Образование'],
  [/game|игр|steam|xbox|playstation|nintendo|gaming/i, 'Игры'],
  [/gym|фитнес|fitness|sport|спорт|тренир|workout/i, 'Фитнес'],
  [/news|новост|медиа|media|magazine|журнал/i, 'Новости'],
];

export function categorize(merchant: string): SubscriptionCategory {
  const lower = merchant.toLowerCase().trim();

  // Level 1: exact lookup
  if (MERCHANT_LOOKUP[lower]) return MERCHANT_LOOKUP[lower];

  // Level 2: partial lookup (merchant name contains known key)
  for (const [key, cat] of Object.entries(MERCHANT_LOOKUP)) {
    if (lower.includes(key) || key.includes(lower)) return cat;
  }

  // Level 3: regex patterns
  for (const [pattern, cat] of PATTERN_MAP) {
    if (pattern.test(merchant)) return cat;
  }

  return 'Другое';
}
