import { PrismaClient, TransactionType, TransactionCategory } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

// Logo helpers
const yLogo = (domain: string) =>
  `https://favicon.yandex.net/favicon/v2/https://${domain}/?size=120`;
const cLogo = (domain: string) =>
  `https://logo.clearbit.com/${domain}`;

interface ServiceDef {
  name: string;
  merchant: string;
  description: string;
  logoUrl: string;
  amount: number;
  periodDays: number;
  category: TransactionCategory;
}

const SERVICES: ServiceDef[] = [
  // ── Видео (11) ──
  { name: 'Яндекс Плюс', merchant: 'Yandex Plus', description: 'Музыка, кино, кешбэк и скидки', logoUrl: yLogo('plus.yandex.ru'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Кинопоиск', merchant: 'Kinopoisk', description: 'Фильмы, сериалы и ТВ-каналы', logoUrl: yLogo('kinopoisk.ru'), amount: 269, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'IVI', merchant: 'IVI', description: 'Онлайн-кинотеатр с премьерами', logoUrl: yLogo('ivi.ru'), amount: 399, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Okko', merchant: 'Okko', description: 'Фильмы, сериалы, спорт', logoUrl: yLogo('okko.tv'), amount: 349, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Premier', merchant: 'Premier', description: 'Онлайн-кинотеатр от ТНТ', logoUrl: yLogo('premier.one'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Start', merchant: 'Start', description: 'Оригинальные сериалы и кино', logoUrl: yLogo('start.ru'), amount: 249, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Wink', merchant: 'Wink', description: 'Кино и ТВ от Ростелеком', logoUrl: yLogo('wink.ru'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'more.tv', merchant: 'More TV', description: 'Сериалы и шоу', logoUrl: yLogo('more.tv'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Амедиатека', merchant: 'Amediateka', description: 'Зарубежные сериалы и кино', logoUrl: yLogo('amediateka.ru'), amount: 599, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'KION', merchant: 'KION', description: 'Онлайн-кинотеатр МТС', logoUrl: yLogo('kion.ru'), amount: 249, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Rutube Premium', merchant: 'Rutube Premium', description: 'Видео без рекламы на Rutube', logoUrl: yLogo('rutube.ru'), amount: 199, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },

  // ── Музыка (6) ──
  { name: 'VK Музыка', merchant: 'VK Music', description: 'Музыка ВКонтакте', logoUrl: yLogo('vk.com'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Яндекс Музыка', merchant: 'Yandex Music', description: 'Музыка, подкасты, радио', logoUrl: yLogo('music.yandex.ru'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Звук', merchant: 'Zvuk', description: 'Музыкальный сервис от Сбера', logoUrl: yLogo('zvuk.com'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'МТС Музыка', merchant: 'MTS Music', description: 'Музыка от МТС', logoUrl: yLogo('music.mts.ru'), amount: 199, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Telegram Premium', merchant: 'Telegram Premium', description: 'Расширенные функции Telegram', logoUrl: yLogo('telegram.org'), amount: 299, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'VK Клипы', merchant: 'VK Clips', description: 'Короткие видео ВКонтакте без рекламы', logoUrl: yLogo('vk.com'), amount: 149, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },

  // ── Банки и телеком (8) ──
  { name: 'МТС Premium', merchant: 'MTS Premium', description: 'Скидки, кешбэк и сервисы МТС', logoUrl: yLogo('mts.ru'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Мегафон Подписка', merchant: 'Megafon', description: 'Видео, музыка и книги', logoUrl: yLogo('megafon.ru'), amount: 349, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Билайн ТВ', merchant: 'Beeline TV', description: 'ТВ-каналы и фильмы', logoUrl: yLogo('beeline.ru'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'VK Combo', merchant: 'VK Combo', description: 'Музыка, такси и доставка', logoUrl: yLogo('vk.com'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Т-Банк Pro', merchant: 'T-Bank Pro', description: 'Кешбэк и переводы без комиссии', logoUrl: yLogo('tbank.ru'), amount: 199, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Т-Банк Premium', merchant: 'T-Bank Premium', description: 'Премиальный банковский сервис', logoUrl: yLogo('tbank.ru'), amount: 990, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'СберПрайм', merchant: 'Sber Prime', description: 'Единая подписка на сервисы Сбера', logoUrl: yLogo('sberbank.ru'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Альфа Подписка', merchant: 'Alfa Subscription', description: 'Кешбэк и привилегии Альфа-Банка', logoUrl: yLogo('alfabank.ru'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },

  // ── Облако (4) ──
  { name: 'Яндекс Диск 100GB', merchant: 'Yandex Disk 100GB', description: 'Расширенное облако Яндекса', logoUrl: yLogo('disk.yandex.ru'), amount: 99, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Яндекс Диск 1TB', merchant: 'Yandex Disk 1TB', description: 'Большое облако Яндекса', logoUrl: yLogo('disk.yandex.ru'), amount: 299, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'VK Облако', merchant: 'VK Cloud', description: 'Облачное хранилище VK', logoUrl: yLogo('cloud.mail.ru'), amount: 149, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Яндекс 360', merchant: 'Yandex 360', description: 'Почта, диск, телемост', logoUrl: yLogo('360.yandex.ru'), amount: 199, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },

  // ── Продуктивность (3) ──
  { name: 'Яндекс Телемост Pro', merchant: 'Yandex Telemost Pro', description: 'Видеозвонки без ограничений', logoUrl: yLogo('telemost.yandex.ru'), amount: 299, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Яндекс GPT Pro', merchant: 'Yandex GPT Pro', description: 'AI-ассистент от Яндекса', logoUrl: yLogo('ya.ru'), amount: 499, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Сфера', merchant: 'Sfera', description: 'Корпоративные сервисы МТС', logoUrl: yLogo('mts.ru'), amount: 599, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },

  // ── Образование (6) ──
  { name: 'Skillbox', merchant: 'Skillbox', description: 'Онлайн-курсы и профессии', logoUrl: yLogo('skillbox.ru'), amount: 3490, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'GeekBrains', merchant: 'GeekBrains', description: 'IT-образование и курсы', logoUrl: yLogo('geekbrains.ru'), amount: 2990, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Нетология', merchant: 'Netologia', description: 'Онлайн-университет', logoUrl: yLogo('netology.ru'), amount: 2490, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Яндекс Практикум', merchant: 'Yandex Practicum', description: 'Обучение IT-профессиям', logoUrl: yLogo('practicum.yandex.ru'), amount: 4900, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Lingualeo', merchant: 'Lingualeo', description: 'Изучение английского языка', logoUrl: yLogo('lingualeo.com'), amount: 299, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Skyeng', merchant: 'Skyeng', description: 'Онлайн-школа английского', logoUrl: yLogo('skyeng.ru'), amount: 1990, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },

  // ── Книги (2) ──
  { name: 'ЛитРес', merchant: 'LitRes', description: 'Электронные и аудиокниги', logoUrl: yLogo('litres.ru'), amount: 449, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'MyBook', merchant: 'MyBook', description: 'Библиотека электронных книг', logoUrl: yLogo('mybook.ru'), amount: 449, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },

  // ── Игры (2) ──
  { name: 'Яндекс Игры Pro', merchant: 'Yandex Games Pro', description: 'Игры без рекламы', logoUrl: yLogo('games.yandex.ru'), amount: 199, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'VK Play Live', merchant: 'VK Play', description: 'Игры и стриминг от VK', logoUrl: yLogo('vkplay.ru'), amount: 299, periodDays: 30, category: TransactionCategory.SUBSCRIPTIONS },

  // ── Маркетплейсы (5) ──
  { name: 'Ozon Premium', merchant: 'Ozon Premium', description: 'Бесплатная доставка и кешбэк', logoUrl: yLogo('ozon.ru'), amount: 299, periodDays: 30, category: TransactionCategory.OTHER },
  { name: 'WB Подписка', merchant: 'WB Subscription', description: 'Скидки и бесплатная доставка', logoUrl: yLogo('wildberries.ru'), amount: 199, periodDays: 30, category: TransactionCategory.OTHER },
  { name: 'Самокат Плюс', merchant: 'Samokat Plus', description: 'Бесплатная доставка продуктов', logoUrl: yLogo('samokat.ru'), amount: 199, periodDays: 30, category: TransactionCategory.OTHER },
  { name: 'Яндекс Лавка', merchant: 'Yandex Lavka', description: 'Быстрая доставка продуктов', logoUrl: yLogo('lavka.yandex.ru'), amount: 199, periodDays: 30, category: TransactionCategory.OTHER },
  { name: 'Купер', merchant: 'Kuper', description: 'Доставка из магазинов (ex-СберМаркет)', logoUrl: yLogo('kuper.ru'), amount: 249, periodDays: 30, category: TransactionCategory.OTHER },

  // ── Транспорт (3) ──
  { name: 'Яндекс Драйв', merchant: 'Yandex Drive', description: 'Каршеринг Яндекса', logoUrl: yLogo('drive.yandex.ru'), amount: 599, periodDays: 30, category: TransactionCategory.TRANSPORT },
  { name: 'Ситидрайв', merchant: 'Citydrive', description: 'Каршеринг по городу', logoUrl: yLogo('citydrive.ru'), amount: 499, periodDays: 30, category: TransactionCategory.TRANSPORT },
  { name: 'BelkaCar', merchant: 'BelkaCar', description: 'Каршеринг в Москве', logoUrl: yLogo('belkacar.ru'), amount: 499, periodDays: 30, category: TransactionCategory.TRANSPORT },

  // ── Здоровье (4) ──
  { name: 'World Class', merchant: 'World Class', description: 'Премиальный фитнес-клуб', logoUrl: yLogo('worldclass.ru'), amount: 7500, periodDays: 30, category: TransactionCategory.HEALTH },
  { name: 'X-Fit', merchant: 'X-Fit', description: 'Сеть фитнес-клубов', logoUrl: yLogo('xfit.ru'), amount: 4990, periodDays: 30, category: TransactionCategory.HEALTH },
  { name: 'Еаптека', merchant: 'Eapteka', description: 'Доставка лекарств онлайн', logoUrl: yLogo('eapteka.ru'), amount: 199, periodDays: 30, category: TransactionCategory.HEALTH },
  { name: 'СберЗдоровье', merchant: 'Sber Health', description: 'Телемедицина от Сбера', logoUrl: yLogo('sberbank.ru'), amount: 399, periodDays: 30, category: TransactionCategory.HEALTH },

  // ── Безопасность (2) ──
  { name: 'Kaspersky', merchant: 'Kaspersky', description: 'Антивирус и защита', logoUrl: yLogo('kaspersky.ru'), amount: 499, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Dr.Web', merchant: 'Dr.Web', description: 'Российский антивирус', logoUrl: yLogo('drweb.ru'), amount: 349, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },

  // ── Прочее (2) ──
  { name: '2ГИС Pro', merchant: '2GIS Pro', description: 'Карты и навигация без рекламы', logoUrl: yLogo('2gis.ru'), amount: 99, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },
  { name: 'Яндекс Почта Pro', merchant: 'Yandex Mail Pro', description: 'Почта без рекламы с доменом', logoUrl: yLogo('mail.yandex.ru'), amount: 149, periodDays: 30, category: TransactionCategory.DIGITAL_SERVICES },

  // ── Годовые (4) ──
  { name: 'Яндекс Плюс (год)', merchant: 'Yandex Plus Year', description: 'Годовая подписка Яндекс Плюс', logoUrl: yLogo('plus.yandex.ru'), amount: 2990, periodDays: 365, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'IVI (год)', merchant: 'IVI Year', description: 'Годовая подписка IVI', logoUrl: yLogo('ivi.ru'), amount: 3990, periodDays: 365, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Okko (год)', merchant: 'Okko Year', description: 'Годовая подписка Okko', logoUrl: yLogo('okko.tv'), amount: 3490, periodDays: 365, category: TransactionCategory.SUBSCRIPTIONS },
  { name: 'Kaspersky (год)', merchant: 'Kaspersky Year', description: 'Годовая защита Kaspersky', logoUrl: yLogo('kaspersky.ru'), amount: 3999, periodDays: 365, category: TransactionCategory.DIGITAL_SERVICES },
];

// Demo user subscriptions (6 services)
const DEMO_SUBSCRIPTIONS = [
  'Yandex Plus',
  'VK Music',
  'Kinopoisk',
  'Yandex Disk 100GB',
  'Telegram Premium',
  'Ozon Premium',
];

async function main() {
  const user = await prisma.user.upsert({
    where: { yandexId: 'demo-seed-user' },
    update: {},
    create: {
      yandexId: 'demo-seed-user',
      email: 'demo@flexbank.test',
      name: 'Demo User',
    },
  });

  console.log(`Seeded user: ${user.id} (${user.email})`);

  const checking = await prisma.account.upsert({
    where: { id: 'seed-checking-001' },
    update: {},
    create: {
      id: 'seed-checking-001',
      userId: user.id,
      name: 'Основной счёт',
      currency: 'RUB',
      initialBalance: 150000,
    },
  });

  const savings = await prisma.account.upsert({
    where: { id: 'seed-savings-001' },
    update: {},
    create: {
      id: 'seed-savings-001',
      userId: user.id,
      name: 'Накопительный счёт',
      currency: 'RUB',
      initialBalance: 500000,
    },
  });

  console.log(`Seeded accounts: ${checking.name}, ${savings.name}`);

  // ── Seed Service Catalog ──
  let serviceCount = 0;
  for (const svc of SERVICES) {
    await prisma.serviceCatalog.upsert({
      where: { merchant: svc.merchant },
      update: {
        name: svc.name,
        description: svc.description,
        logoUrl: svc.logoUrl,
        amount: svc.amount,
        periodDays: svc.periodDays,
        category: svc.category,
      },
      create: {
        name: svc.name,
        merchant: svc.merchant,
        description: svc.description,
        logoUrl: svc.logoUrl,
        amount: svc.amount,
        periodDays: svc.periodDays,
        category: svc.category,
      },
    });
    serviceCount++;
  }
  console.log(`Seeded ${serviceCount} services in catalog`);

  // ── Demo user subscriptions ──
  let subCount = 0;
  for (const merchant of DEMO_SUBSCRIPTIONS) {
    const service = await prisma.serviceCatalog.findUnique({
      where: { merchant },
    });
    if (!service) {
      console.warn(`Service not found: ${merchant}`);
      continue;
    }

    // Check if already subscribed
    const existing = await prisma.userSubscription.findUnique({
      where: { userId_serviceId: { userId: user.id, serviceId: service.id } },
    });
    if (existing) {
      subCount++;
      continue;
    }

    // Stagger subscription charges across the month
    const startOffsets = [2, 7, 13, 19, 25];
    const dayOffset = startOffsets[subCount % startOffsets.length];

    // Create RecurringPayment
    const rp = await prisma.recurringPayment.create({
      data: {
        accountId: checking.id,
        merchant: service.name,
        amount: -service.amount,
        currency: service.currency,
        category: service.category,
        periodDays: service.periodDays,
        nextChargeDate: daysFromNow(dayOffset),
        status: 'ACTIVE',
      },
    });

    // Create UserSubscription
    await prisma.userSubscription.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        accountId: checking.id,
        recurringPaymentId: rp.id,
        status: 'ACTIVE',
        subscribedAt: daysAgo(Math.floor(Math.random() * 60) + 30),
      },
    });

    // Generate 4 months of transaction history with staggered dates
    const monthsBack = 4;
    for (let m = 0; m < monthsBack; m++) {
      const txDayOffset = m * service.periodDays + dayOffset;
      if (txDayOffset > 120) break;

      await prisma.transaction.create({
        data: {
          accountId: checking.id,
          date: daysAgo(txDayOffset),
          amount: -service.amount,
          description: `Подписка: ${service.name}`,
          merchant: service.name,
          type: TransactionType.EXPENSE,
          category: service.category,
        },
      });
    }
    subCount++;
  }
  console.log(`Seeded ${subCount} demo subscriptions`);

  // ── One-off transactions spread across 4 months ──
  const oneOffs = [
    // Last 7 days
    { id: 'seed-tx-magnit',     days: -1,  amount: -2300,  desc: 'Магнит',                  merchant: 'Magnit',      type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-grocery',    days: -3,  amount: -4500,  desc: 'Пятёрочка',               merchant: 'Pyaterochka', type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-taxi1',      days: -5,  amount: -1200,  desc: 'Яндекс Такси',            merchant: 'Yandex Taxi', type: TransactionType.EXPENSE,  cat: TransactionCategory.TRANSPORT },
    { id: 'seed-tx-coffee1',    days: -6,  amount: -850,   desc: 'Кофейня',                  merchant: 'Coffee Shop', type: TransactionType.EXPENSE,  cat: TransactionCategory.RESTAURANTS },
    // 7-14 days
    { id: 'seed-tx-salary',     days: -8,  amount: 85000,  desc: 'Зарплата',                merchant: null,          type: TransactionType.INCOME,   cat: TransactionCategory.OTHER },
    { id: 'seed-tx-restaurant', days: -9,  amount: -3200,  desc: 'Ресторан "Место"',        merchant: 'Mesto',       type: TransactionType.EXPENSE,  cat: TransactionCategory.RESTAURANTS },
    { id: 'seed-tx-wb1',        days: -11, amount: -1500,  desc: 'Wildberries',             merchant: 'Wildberries', type: TransactionType.EXPENSE,  cat: TransactionCategory.OTHER },
    { id: 'seed-tx-pharmacy',   days: -13, amount: -2100,  desc: 'Аптека "Здоровье"',       merchant: 'Zdorovye',    type: TransactionType.EXPENSE,  cat: TransactionCategory.HEALTH },
    // 14-30 days
    { id: 'seed-tx-perek1',     days: -16, amount: -5200,  desc: 'Перекрёсток',             merchant: 'Perekrestok', type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-uber1',      days: -18, amount: -1800,  desc: 'Uber поездка',            merchant: 'Uber',        type: TransactionType.EXPENSE,  cat: TransactionCategory.TRANSPORT },
    { id: 'seed-tx-cafe1',      days: -21, amount: -950,   desc: 'Кафе Му-Му',              merchant: 'Mu-Mu',       type: TransactionType.EXPENSE,  cat: TransactionCategory.RESTAURANTS },
    { id: 'seed-tx-grocery2',   days: -24, amount: -3800,  desc: 'Пятёрочка',               merchant: 'Pyaterochka', type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-transfer',   days: -26, amount: -15000, desc: 'Перевод на накопительный', merchant: null,          type: TransactionType.TRANSFER, cat: TransactionCategory.TRANSFERS },
    { id: 'seed-tx-taxi2',      days: -27, amount: -1400,  desc: 'Яндекс Такси',            merchant: 'Yandex Taxi', type: TransactionType.EXPENSE,  cat: TransactionCategory.TRANSPORT },
    // 30-60 days
    { id: 'seed-tx-lenta1',     days: -32, amount: -4200,  desc: 'Лента',                    merchant: 'Lenta',       type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-salary2',    days: -35, amount: 85000,  desc: 'Зарплата',                merchant: null,          type: TransactionType.INCOME,   cat: TransactionCategory.OTHER },
    { id: 'seed-tx-rest2',      days: -38, amount: -2800,  desc: 'Ресторан',                 merchant: 'Restaurant',  type: TransactionType.EXPENSE,  cat: TransactionCategory.RESTAURANTS },
    { id: 'seed-tx-pharm2',     days: -42, amount: -1600,  desc: 'Аптека',                    merchant: 'Pharmacy',    type: TransactionType.EXPENSE,  cat: TransactionCategory.HEALTH },
    { id: 'seed-tx-taxi3',      days: -45, amount: -900,   desc: 'Яндекс Такси',             merchant: 'Yandex Taxi', type: TransactionType.EXPENSE,  cat: TransactionCategory.TRANSPORT },
    { id: 'seed-tx-perek2',     days: -48, amount: -5600,  desc: 'Перекрёсток',              merchant: 'Perekrestok', type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-ozon1',      days: -52, amount: -2200,  desc: 'OZON заказ',               merchant: 'Ozon',        type: TransactionType.EXPENSE,  cat: TransactionCategory.OTHER },
    // 60-90 days
    { id: 'seed-tx-salary3',    days: -62, amount: 85000,  desc: 'Зарплата',                merchant: null,          type: TransactionType.INCOME,   cat: TransactionCategory.OTHER },
    { id: 'seed-tx-grocery3',   days: -65, amount: -3500,  desc: 'Пятёрочка',               merchant: 'Pyaterochka', type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-uber2',      days: -70, amount: -1300,  desc: 'Uber поездка',            merchant: 'Uber',        type: TransactionType.EXPENSE,  cat: TransactionCategory.TRANSPORT },
    { id: 'seed-tx-rest3',      days: -75, amount: -2900,  desc: 'Ресторан',                 merchant: 'Restaurant',  type: TransactionType.EXPENSE,  cat: TransactionCategory.RESTAURANTS },
    { id: 'seed-tx-lenta2',     days: -80, amount: -4100,  desc: 'Лента',                    merchant: 'Lenta',       type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    // 90-120 days
    { id: 'seed-tx-salary4',    days: -92,  amount: 85000, desc: 'Зарплата',                merchant: null,          type: TransactionType.INCOME,   cat: TransactionCategory.OTHER },
    { id: 'seed-tx-perek3',     days: -95,  amount: -3700, desc: 'Перекрёсток',              merchant: 'Perekrestok', type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-taxi4',      days: -100, amount: -1100, desc: 'Яндекс Такси',             merchant: 'Yandex Taxi', type: TransactionType.EXPENSE,  cat: TransactionCategory.TRANSPORT },
    { id: 'seed-tx-pharm3',     days: -110, amount: -2500, desc: 'Аптека',                    merchant: 'Pharmacy',    type: TransactionType.EXPENSE,  cat: TransactionCategory.HEALTH },
  ];

  for (const t of oneOffs) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        accountId: checking.id,
        date: daysAgo(-t.days),
        amount: t.amount,
        description: t.desc,
        merchant: t.merchant,
        type: t.type,
        category: t.cat,
      },
    });
  }

  console.log(`Seeded ${oneOffs.length} one-off transactions`);
  console.log(`\nTotal: ${serviceCount} services, ${subCount} subscriptions, done!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
