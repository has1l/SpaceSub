"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(12, 0, 0, 0);
    return d;
}
function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(12, 0, 0, 0);
    return d;
}
// Logo helpers
const yLogo = (domain) => `https://favicon.yandex.net/favicon/v2/https://${domain}/?size=120`;
const cLogo = (domain) => `https://logo.clearbit.com/${domain}`;
const SERVICES = [
    // ── Video (14) ──
    { name: 'Яндекс Плюс', merchant: 'Yandex Plus', description: 'Музыка, кино, кешбэк и скидки', logoUrl: yLogo('plus.yandex.ru'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Кинопоиск', merchant: 'Kinopoisk', description: 'Фильмы, сериалы и ТВ-каналы', logoUrl: yLogo('kinopoisk.ru'), amount: 269, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Netflix', merchant: 'Netflix', description: 'Стриминг фильмов и сериалов', logoUrl: cLogo('netflix.com'), amount: 890, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'IVI', merchant: 'IVI', description: 'Онлайн-кинотеатр с премьерами', logoUrl: yLogo('ivi.ru'), amount: 399, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Okko', merchant: 'Okko', description: 'Фильмы, сериалы, спорт', logoUrl: yLogo('okko.tv'), amount: 349, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Premier', merchant: 'Premier', description: 'Онлайн-кинотеатр от ТНТ', logoUrl: yLogo('premier.one'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Start', merchant: 'Start', description: 'Оригинальные сериалы и кино', logoUrl: yLogo('start.ru'), amount: 249, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Wink', merchant: 'Wink', description: 'Кино и ТВ от Ростелеком', logoUrl: yLogo('wink.ru'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'more.tv', merchant: 'More TV', description: 'Сериалы и шоу', logoUrl: yLogo('more.tv'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Амедиатека', merchant: 'Amediateka', description: 'Премиальные сериалы HBO', logoUrl: yLogo('amediateka.ru'), amount: 599, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'KION', merchant: 'KION', description: 'Онлайн-кинотеатр МТС', logoUrl: yLogo('kion.ru'), amount: 249, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Disney+', merchant: 'Disney Plus', description: 'Disney, Pixar, Marvel, Star Wars', logoUrl: cLogo('disneyplus.com'), amount: 699, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'HBO Max', merchant: 'HBO Max', description: 'Премиальный стриминг HBO', logoUrl: cLogo('hbomax.com'), amount: 799, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Amazon Prime Video', merchant: 'Amazon Prime', description: 'Фильмы и сериалы Amazon', logoUrl: cLogo('primevideo.com'), amount: 499, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    // ── Music (10) ──
    { name: 'Spotify', merchant: 'Spotify', description: 'Музыка и подкасты', logoUrl: cLogo('spotify.com'), amount: 549, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Apple Music', merchant: 'Apple Music', description: 'Музыкальный стриминг Apple', logoUrl: cLogo('music.apple.com'), amount: 499, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'YouTube Music', merchant: 'YouTube Music', description: 'Музыка без рекламы', logoUrl: cLogo('music.youtube.com'), amount: 399, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'YouTube Premium', merchant: 'YouTube Premium', description: 'YouTube без рекламы + Music', logoUrl: cLogo('youtube.com'), amount: 549, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'VK Музыка', merchant: 'VK Music', description: 'Музыка ВКонтакте', logoUrl: yLogo('vk.com'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Яндекс Музыка', merchant: 'Yandex Music', description: 'Музыка, подкасты, радио', logoUrl: yLogo('music.yandex.ru'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'СберЗвук', merchant: 'SberZvuk', description: 'Музыкальный сервис Сбера', logoUrl: yLogo('sberzvuk.com'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'МТС Музыка', merchant: 'MTS Music', description: 'Музыка от МТС', logoUrl: yLogo('music.mts.ru'), amount: 199, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Deezer', merchant: 'Deezer', description: 'Музыкальный стриминг', logoUrl: cLogo('deezer.com'), amount: 449, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Tidal', merchant: 'Tidal', description: 'Hi-Fi музыкальный стриминг', logoUrl: cLogo('tidal.com'), amount: 699, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    // ── Telecom (8) ──
    { name: 'МТС Premium', merchant: 'MTS Premium', description: 'Скидки, кешбэк и сервисы МТС', logoUrl: yLogo('mts.ru'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Мегафон Подписка', merchant: 'Megafon', description: 'Видео, музыка и книги', logoUrl: yLogo('megafon.ru'), amount: 349, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Билайн ТВ', merchant: 'Beeline TV', description: 'ТВ-каналы и фильмы', logoUrl: yLogo('beeline.ru'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'VK Combo', merchant: 'VK Combo', description: 'Музыка, такси и доставка', logoUrl: yLogo('vk.com'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Тинькофф Pro', merchant: 'Tinkoff Pro', description: 'Кешбэк и переводы без комиссии', logoUrl: yLogo('tinkoff.ru'), amount: 199, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Тинькофф Premium', merchant: 'Tinkoff Premium', description: 'Премиальный банковский сервис', logoUrl: yLogo('tinkoff.ru'), amount: 990, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'СберПрайм', merchant: 'Sber Prime', description: 'Единая подписка на сервисы Сбера', logoUrl: yLogo('sberbank.ru'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Альфа Подписка', merchant: 'Alfa Subscription', description: 'Кешбэк и привилегии', logoUrl: yLogo('alfabank.ru'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    // ── Cloud (8) ──
    { name: 'iCloud+ 50GB', merchant: 'iCloud 50GB', description: 'Облачное хранилище Apple', logoUrl: cLogo('icloud.com'), amount: 99, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'iCloud+ 200GB', merchant: 'iCloud 200GB', description: 'Расширенное хранилище Apple', logoUrl: cLogo('icloud.com'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Google One 100GB', merchant: 'Google One 100GB', description: 'Облако Google с бонусами', logoUrl: cLogo('one.google.com'), amount: 139, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Google One 2TB', merchant: 'Google One 2TB', description: 'Расширенное облако Google', logoUrl: cLogo('one.google.com'), amount: 699, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Яндекс Диск', merchant: 'Yandex Disk', description: 'Облачное хранилище Яндекса', logoUrl: yLogo('disk.yandex.ru'), amount: 99, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Dropbox', merchant: 'Dropbox', description: 'Облачное хранилище файлов', logoUrl: cLogo('dropbox.com'), amount: 799, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Mail.ru Облако', merchant: 'Mail Cloud', description: 'Облачное хранилище Mail.ru', logoUrl: yLogo('cloud.mail.ru'), amount: 149, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Яндекс 360', merchant: 'Yandex 360', description: 'Почта, диск, телемост', logoUrl: yLogo('360.yandex.ru'), amount: 199, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    // ── Productivity (10) ──
    { name: 'Microsoft 365', merchant: 'Microsoft 365', description: 'Office, OneDrive, Teams', logoUrl: cLogo('microsoft.com'), amount: 399, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Adobe Creative Cloud', merchant: 'Adobe CC', description: 'Photoshop, Illustrator и другие', logoUrl: cLogo('adobe.com'), amount: 3990, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Figma', merchant: 'Figma', description: 'Дизайн и прототипирование', logoUrl: cLogo('figma.com'), amount: 1200, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Canva Pro', merchant: 'Canva', description: 'Дизайн для всех', logoUrl: cLogo('canva.com'), amount: 999, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Notion', merchant: 'Notion', description: 'Заметки и управление проектами', logoUrl: cLogo('notion.so'), amount: 800, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Telegram Premium', merchant: 'Telegram Premium', description: 'Расширенные функции Telegram', logoUrl: yLogo('telegram.org'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'ChatGPT Plus', merchant: 'ChatGPT Plus', description: 'Продвинутый AI-ассистент', logoUrl: cLogo('openai.com'), amount: 2000, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Claude Pro', merchant: 'Claude Pro', description: 'AI от Anthropic', logoUrl: cLogo('anthropic.com'), amount: 2000, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Midjourney', merchant: 'Midjourney', description: 'AI-генерация изображений', logoUrl: cLogo('midjourney.com'), amount: 1000, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'GitHub Copilot', merchant: 'GitHub Copilot', description: 'AI-помощник для кода', logoUrl: cLogo('github.com'), amount: 1000, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    // ── Education (8) ──
    { name: 'Skillbox', merchant: 'Skillbox', description: 'Онлайн-курсы и профессии', logoUrl: yLogo('skillbox.ru'), amount: 3490, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'GeekBrains', merchant: 'GeekBrains', description: 'IT-образование и курсы', logoUrl: yLogo('geekbrains.ru'), amount: 2990, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Нетология', merchant: 'Netologia', description: 'Онлайн-университет', logoUrl: yLogo('netology.ru'), amount: 2490, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Яндекс Практикум', merchant: 'Yandex Practicum', description: 'Обучение IT-профессиям', logoUrl: yLogo('practicum.yandex.ru'), amount: 4900, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Duolingo', merchant: 'Duolingo', description: 'Изучение языков', logoUrl: cLogo('duolingo.com'), amount: 449, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Coursera', merchant: 'Coursera', description: 'Курсы ведущих университетов', logoUrl: cLogo('coursera.org'), amount: 3800, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Lingualeo', merchant: 'Lingualeo', description: 'Изучение английского языка', logoUrl: yLogo('lingualeo.com'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Skyeng', merchant: 'Skyeng', description: 'Онлайн-школа английского', logoUrl: yLogo('skyeng.ru'), amount: 1990, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    // ── Books (4) ──
    { name: 'ЛитРес', merchant: 'LitRes', description: 'Электронные и аудиокниги', logoUrl: yLogo('litres.ru'), amount: 449, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'MyBook', merchant: 'MyBook', description: 'Библиотека электронных книг', logoUrl: yLogo('mybook.ru'), amount: 449, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Storytel', merchant: 'Storytel', description: 'Аудиокниги и подкасты', logoUrl: cLogo('storytel.com'), amount: 549, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Bookmate', merchant: 'Bookmate', description: 'Книги, аудиокниги, комиксы', logoUrl: yLogo('bookmate.com'), amount: 399, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    // ── Games (7) ──
    { name: 'PS Plus Essential', merchant: 'PS Plus Essential', description: 'Онлайн и бесплатные игры', logoUrl: cLogo('playstation.com'), amount: 654, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'PS Plus Extra', merchant: 'PS Plus Extra', description: 'Каталог игр PlayStation', logoUrl: cLogo('playstation.com'), amount: 939, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Xbox Game Pass Core', merchant: 'Xbox Core', description: 'Онлайн и бесплатные игры Xbox', logoUrl: cLogo('xbox.com'), amount: 579, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Xbox Game Pass Ultimate', merchant: 'Xbox Ultimate', description: 'Игры Xbox, PC, Cloud', logoUrl: cLogo('xbox.com'), amount: 1099, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Nintendo Switch Online', merchant: 'Nintendo Online', description: 'Онлайн-игры Nintendo', logoUrl: cLogo('nintendo.com'), amount: 319, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'EA Play', merchant: 'EA Play', description: 'Игры Electronic Arts', logoUrl: cLogo('ea.com'), amount: 349, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'GeForce NOW', merchant: 'GeForce NOW', description: 'Облачный гейминг NVIDIA', logoUrl: cLogo('nvidia.com'), amount: 599, periodDays: 30, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    // ── Marketplaces (6) ──
    { name: 'Ozon Premium', merchant: 'Ozon Premium', description: 'Бесплатная доставка и кешбэк', logoUrl: yLogo('ozon.ru'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.OTHER },
    { name: 'Wildberries Plus', merchant: 'Wildberries Plus', description: 'Скидки и бесплатная доставка', logoUrl: yLogo('wildberries.ru'), amount: 199, periodDays: 30, category: client_1.TransactionCategory.OTHER },
    { name: 'Самокат Плюс', merchant: 'Samokat Plus', description: 'Бесплатная доставка продуктов', logoUrl: yLogo('samokat.ru'), amount: 199, periodDays: 30, category: client_1.TransactionCategory.OTHER },
    { name: 'Delivery Club Plus', merchant: 'Delivery Club Plus', description: 'Бесплатная доставка еды', logoUrl: yLogo('delivery-club.ru'), amount: 199, periodDays: 30, category: client_1.TransactionCategory.OTHER },
    { name: 'Яндекс Лавка', merchant: 'Yandex Lavka', description: 'Быстрая доставка продуктов', logoUrl: yLogo('lavka.yandex.ru'), amount: 199, periodDays: 30, category: client_1.TransactionCategory.OTHER },
    { name: 'СберМаркет', merchant: 'SberMarket', description: 'Доставка из любимых магазинов', logoUrl: yLogo('sbermarket.ru'), amount: 249, periodDays: 30, category: client_1.TransactionCategory.OTHER },
    // ── Transport (3) ──
    { name: 'Яндекс Драйв', merchant: 'Yandex Drive', description: 'Каршеринг Яндекса', logoUrl: yLogo('drive.yandex.ru'), amount: 599, periodDays: 30, category: client_1.TransactionCategory.TRANSPORT },
    { name: 'Ситидрайв', merchant: 'Citydrive', description: 'Каршеринг по городу', logoUrl: yLogo('citydrive.ru'), amount: 499, periodDays: 30, category: client_1.TransactionCategory.TRANSPORT },
    { name: 'BelkaCar', merchant: 'BelkaCar', description: 'Каршеринг в Москве', logoUrl: yLogo('belkacar.ru'), amount: 499, periodDays: 30, category: client_1.TransactionCategory.TRANSPORT },
    // ── Health (5) ──
    { name: 'World Class', merchant: 'World Class', description: 'Премиальный фитнес-клуб', logoUrl: yLogo('worldclass.ru'), amount: 7500, periodDays: 30, category: client_1.TransactionCategory.HEALTH },
    { name: 'X-Fit', merchant: 'X-Fit', description: 'Сеть фитнес-клубов', logoUrl: yLogo('xfit.ru'), amount: 4990, periodDays: 30, category: client_1.TransactionCategory.HEALTH },
    { name: 'Headspace', merchant: 'Headspace', description: 'Медитация и майндфулнес', logoUrl: cLogo('headspace.com'), amount: 449, periodDays: 30, category: client_1.TransactionCategory.HEALTH },
    { name: 'Strava', merchant: 'Strava', description: 'Трекер бега и велоспорта', logoUrl: cLogo('strava.com'), amount: 449, periodDays: 30, category: client_1.TransactionCategory.HEALTH },
    { name: 'Сбер Еаптека', merchant: 'Sber Eapteka', description: 'Доставка лекарств', logoUrl: yLogo('eapteka.ru'), amount: 199, periodDays: 30, category: client_1.TransactionCategory.HEALTH },
    // ── VPN & Security (5) ──
    { name: 'NordVPN', merchant: 'NordVPN', description: 'VPN для приватности', logoUrl: cLogo('nordvpn.com'), amount: 529, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'ExpressVPN', merchant: 'ExpressVPN', description: 'Быстрый и надёжный VPN', logoUrl: cLogo('expressvpn.com'), amount: 929, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Surfshark', merchant: 'Surfshark', description: 'VPN без ограничений устройств', logoUrl: cLogo('surfshark.com'), amount: 399, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Kaspersky', merchant: 'Kaspersky', description: 'Антивирус и защита', logoUrl: yLogo('kaspersky.ru'), amount: 499, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: '1Password', merchant: '1Password', description: 'Менеджер паролей', logoUrl: cLogo('1password.com'), amount: 299, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    // ── Other (4) ──
    { name: 'Twitch Turbo', merchant: 'Twitch Turbo', description: 'Twitch без рекламы', logoUrl: cLogo('twitch.tv'), amount: 799, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'LinkedIn Premium', merchant: 'LinkedIn Premium', description: 'Расширенные возможности LinkedIn', logoUrl: cLogo('linkedin.com'), amount: 2500, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: '2ГИС', merchant: '2GIS', description: 'Карты и навигация без рекламы', logoUrl: yLogo('2gis.ru'), amount: 99, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Zoom Pro', merchant: 'Zoom Pro', description: 'Видеоконференции без ограничений', logoUrl: cLogo('zoom.us'), amount: 1100, periodDays: 30, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    // ── Annual subscriptions (9) ──
    { name: 'Яндекс Плюс (год)', merchant: 'Yandex Plus Year', description: 'Годовая подписка Яндекс Плюс', logoUrl: yLogo('plus.yandex.ru'), amount: 2990, periodDays: 365, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'IVI (год)', merchant: 'IVI Year', description: 'Годовая подписка IVI', logoUrl: yLogo('ivi.ru'), amount: 3990, periodDays: 365, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Okko (год)', merchant: 'Okko Year', description: 'Годовая подписка Okko', logoUrl: yLogo('okko.tv'), amount: 3490, periodDays: 365, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'Spotify (год)', merchant: 'Spotify Year', description: 'Годовая подписка Spotify', logoUrl: cLogo('spotify.com'), amount: 4390, periodDays: 365, category: client_1.TransactionCategory.SUBSCRIPTIONS },
    { name: 'iCloud+ 2TB (год)', merchant: 'iCloud 2TB Year', description: 'Годовая подписка iCloud 2TB', logoUrl: cLogo('icloud.com'), amount: 7188, periodDays: 365, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Duolingo (год)', merchant: 'Duolingo Year', description: 'Годовая подписка Duolingo', logoUrl: cLogo('duolingo.com'), amount: 3990, periodDays: 365, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'NordVPN (год)', merchant: 'NordVPN Year', description: 'Годовая подписка NordVPN', logoUrl: cLogo('nordvpn.com'), amount: 4390, periodDays: 365, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Microsoft 365 Family (год)', merchant: 'Microsoft 365 Family Year', description: 'Office для всей семьи, год', logoUrl: cLogo('microsoft.com'), amount: 4199, periodDays: 365, category: client_1.TransactionCategory.DIGITAL_SERVICES },
    { name: 'Kaspersky (год)', merchant: 'Kaspersky Year', description: 'Годовая защита Kaspersky', logoUrl: yLogo('kaspersky.ru'), amount: 3999, periodDays: 365, category: client_1.TransactionCategory.DIGITAL_SERVICES },
];
// Demo user subscriptions (6 services)
const DEMO_SUBSCRIPTIONS = [
    'Yandex Plus',
    'Spotify',
    'Netflix',
    'iCloud 50GB',
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
        // Create RecurringPayment
        const rp = await prisma.recurringPayment.create({
            data: {
                accountId: checking.id,
                merchant: service.name,
                amount: -service.amount,
                currency: service.currency,
                category: service.category,
                periodDays: service.periodDays,
                nextChargeDate: daysFromNow(Math.floor(Math.random() * 25) + 3),
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
        // Generate 3-4 months of transaction history
        const monthsBack = 4;
        for (let m = 0; m < monthsBack; m++) {
            const dayOffset = m * service.periodDays + Math.floor(Math.random() * 3);
            if (dayOffset > 120)
                break;
            await prisma.transaction.create({
                data: {
                    accountId: checking.id,
                    date: daysAgo(dayOffset),
                    amount: -service.amount,
                    description: `Подписка: ${service.name}`,
                    merchant: service.name,
                    type: client_1.TransactionType.EXPENSE,
                    category: service.category,
                },
            });
        }
        subCount++;
    }
    console.log(`Seeded ${subCount} demo subscriptions`);
    // ── One-off transactions ──
    const oneOffs = [
        { id: 'seed-tx-grocery', days: -3, amount: -4500, desc: 'Пятёрочка', merchant: 'Pyaterochka', type: client_1.TransactionType.EXPENSE, cat: client_1.TransactionCategory.SUPERMARKETS },
        { id: 'seed-tx-salary', days: -5, amount: 85000, desc: 'Зарплата', merchant: null, type: client_1.TransactionType.INCOME, cat: client_1.TransactionCategory.OTHER },
        { id: 'seed-tx-uber', days: -7, amount: -1200, desc: 'Uber поездка', merchant: 'Uber', type: client_1.TransactionType.EXPENSE, cat: client_1.TransactionCategory.TRANSPORT },
        { id: 'seed-tx-restaurant', days: -8, amount: -3200, desc: 'Ресторан "Место"', merchant: 'Mesto', type: client_1.TransactionType.EXPENSE, cat: client_1.TransactionCategory.RESTAURANTS },
        { id: 'seed-tx-transfer', days: -12, amount: -15000, desc: 'Перевод на накопительный', merchant: null, type: client_1.TransactionType.TRANSFER, cat: client_1.TransactionCategory.TRANSFERS },
        { id: 'seed-tx-pharmacy', days: -14, amount: -2100, desc: 'Аптека "Здоровье"', merchant: 'Zdorovye', type: client_1.TransactionType.EXPENSE, cat: client_1.TransactionCategory.HEALTH },
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
