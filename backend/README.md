# SpaceSub Backend

Бэкенд для **SpaceSub** — сервиса управления подписками. Отслеживай свои подписки, анализируй расходы и получай уведомления о предстоящих списаниях.

## Архитектура

Модульная архитектура на NestJS с разделением ответственности:

- **Auth** — OAuth2 авторизация через Яндекс ID + JWT
- **Users** — управление профилями
- **Subscriptions** — CRUD подписок
- **Transactions** — импорт и хранение транзакций
- **Analytics** — аналитика расходов
- **Forecast** — прогнозирование расходов
- **Notifications** — уведомления о списаниях
- **Integration** — подключение банков и почты

## Стек

| Технология | Назначение |
|-----------|-----------|
| Node.js 20 | Runtime |
| NestJS 11 | Backend framework |
| TypeScript | Язык |
| PostgreSQL 16 | База данных |
| Prisma 6 | ORM |
| Passport + JWT | Аутентификация |
| Swagger | API документация |
| Docker | Контейнеризация |

## Быстрый старт

### Требования

- Node.js >= 20
- PostgreSQL 16 (локально или Docker)

### 1. Клонирование и установка

```bash
git clone https://github.com/has1l/SpaceSub.git
cd SpaceSub/backend
npm install
```

### 2. Настройка окружения

```bash
cp .env.example .env
```

Заполни `.env` своими значениями:

```env
DATABASE_URL="postgresql://spacesub:spacesub@localhost:5432/spacesub?schema=public"
JWT_SECRET="your-secret-key"
YANDEX_CLIENT_ID="your-yandex-client-id"
YANDEX_CLIENT_SECRET="your-yandex-client-secret"
YANDEX_REDIRECT_URI="http://localhost:3000/auth/yandex/callback"
PORT=3000
```

### 3. Настройка базы данных

**С Docker:**

```bash
docker compose up -d postgres
```

**Без Docker (macOS с Homebrew):**

```bash
psql -U postgres -c "CREATE USER spacesub WITH PASSWORD 'spacesub' CREATEDB;"
psql -U postgres -c "CREATE DATABASE spacesub OWNER spacesub;"
```

### 4. Миграции

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Запуск

```bash
# Разработка (hot-reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Запуск через Docker Compose (всё сразу)

```bash
docker compose up -d
```

## API Endpoints

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| `GET` | `/auth/yandex` | Редирект на Яндекс OAuth | - |
| `GET` | `/auth/yandex/callback` | Callback авторизации | - |
| `GET` | `/users/me` | Текущий пользователь | JWT |
| `POST` | `/subscriptions` | Создать подписку | JWT |
| `GET` | `/subscriptions` | Список подписок | JWT |
| `GET` | `/subscriptions/:id` | Подписка по ID | JWT |
| `PUT` | `/subscriptions/:id` | Обновить подписку | JWT |
| `DELETE` | `/subscriptions/:id` | Удалить подписку | JWT |
| `POST` | `/transactions/import` | Импорт транзакций | JWT |
| `GET` | `/transactions` | Список транзакций | JWT |
| `GET` | `/analytics` | Аналитика | JWT |
| `GET` | `/forecast` | Прогноз расходов | JWT |
| `GET` | `/notifications` | Уведомления | JWT |
| `GET` | `/integration/banks` | Список банков | JWT |
| `POST` | `/integration/banks/connect` | Подключить банк | JWT |
| `GET` | `/integration/email` | Статус почты | JWT |
| `POST` | `/integration/email/connect` | Подключить почту | JWT |

## Swagger

После запуска сервера документация доступна по адресу:

```
http://localhost:3000/api/docs
```

## Структура проекта

```
backend/
├── prisma/
│   ├── schema.prisma          # Схема БД
│   └── migrations/            # Миграции
├── src/
│   ├── main.ts                # Точка входа
│   ├── app.module.ts          # Корневой модуль
│   ├── prisma/                # Prisma сервис
│   ├── auth/                  # Авторизация (Яндекс OAuth + JWT)
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── dto/
│   ├── users/                 # Пользователи
│   ├── subscriptions/         # Подписки (CRUD)
│   │   └── dto/
│   ├── transactions/          # Транзакции
│   ├── analytics/             # Аналитика
│   ├── forecast/              # Прогнозирование
│   ├── notifications/         # Уведомления
│   └── integration/           # Банки и почта
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Roadmap

- [x] Авторизация через Яндекс ID
- [x] CRUD подписок
- [x] JWT-аутентификация
- [x] Swagger документация
- [x] Docker-контейнеризация
- [ ] Импорт транзакций из банков
- [ ] Парсинг подписок из email
- [ ] Аналитика расходов по категориям
- [ ] Прогнозирование расходов (ML)
- [ ] Push/email-уведомления о списаниях
- [ ] Cron-задачи для автоматических проверок
- [ ] Rate limiting и throttling
- [ ] Тесты (unit + e2e)
