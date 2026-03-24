<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/SwiftUI-5-FA7343?style=for-the-badge&logo=swift" alt="SwiftUI" />
  <img src="https://img.shields.io/badge/Jetpack_Compose-Material3-4285F4?style=for-the-badge&logo=android" alt="Jetpack Compose" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
</p>

<h1 align="center">SpaceSub — Монитор подписок</h1>

<p align="center">
  <b>Кроссплатформенное приложение для автоматического отслеживания, аналитики и прогнозирования расходов на подписки</b>
</p>

<p align="center">
  Web · iOS · Android — единый backend, синхронизация в реальном времени
</p>

---

## Оглавление

- [О проекте](#о-проекте)
- [Возможности](#возможности)
- [Архитектура](#архитектура)
- [Структура монорепозитория](#структура-монорепозитория)
- [Технологический стек](#технологический-стек)
- [Требования](#требования)
- [Установка и запуск](#установка-и-запуск)
  - [1. Клонирование и зависимости](#1-клонирование-и-зависимости)
  - [2. База данных](#2-база-данных)
  - [3. Yandex OAuth](#3-yandex-oauth)
  - [4. Переменные окружения](#4-переменные-окружения)
  - [5. Миграции и seed](#5-миграции-и-seed)
  - [6. Запуск в dev-режиме](#6-запуск-в-dev-режиме)
  - [7. Сборка iOS](#7-сборка-ios)
  - [8. Сборка Android](#8-сборка-android)
- [Деплой](#деплой)
- [API документация](#api-документация)
- [Переменные окружения](#переменные-окружения-1)
- [Схема базы данных](#схема-базы-данных)
- [Команда](#команда)

---

## О проекте

**SpaceSub** — это полнофункциональная платформа для управления подписками. Приложение автоматически обнаруживает рекуррентные платежи из банковских транзакций, категоризирует их, строит аналитику расходов и прогнозирует будущие списания.

Проект включает собственный **Mock Bank (Flex Bank)** — симуляцию банковского API с каталогом из 100+ реальных сервисов, OAuth-авторизацией и генерацией транзакций. Это позволяет продемонстрировать полный цикл работы: от подключения банка до детальной аналитики подписок.

---

## Возможности

### Автоимпорт подписок
- Подключение банковского счёта через OAuth 2.0
- Автоматическое обнаружение рекуррентных платежей из истории транзакций (confidence 0.5–0.95)
- Импорт банковских подписок с точной привязкой (confidence 1.0)
- Распознавание периодичности: еженедельные, ежемесячные, ежеквартальные, годовые
- Фоновая синхронизация каждые 10 минут

### Аналитика расходов
- Интерактивная круговая диаграмма расходов по категориям (donut chart)
- График динамики расходов по реальным транзакциям (area chart)
- Гистограмма расходов по сервисам (bar chart)
- Переключение периодов: 7 дней / 1 месяц / 3 месяца / 12 месяцев
- Масштабирование с учётом цикла подписок (недельная × 4 в месяц, годовая / 12 и т.д.)
- Скоринг здоровья подписок и персональные рекомендации

### Прогнозирование
- Прогноз расходов на ближайший период
- Хронология предстоящих списаний с точными датами
- HUD-метрики: ежемесячный и годовой прогноз

### Каталог подписок Flex Bank
- Каталог из 101 реального сервиса (Netflix, Spotify, Яндекс Плюс, Кинопоиск и др.)
- Подписка и отписка прямо в интерфейсе банка
- Автоматическая генерация транзакций при подписке
- Реальные логотипы сервисов

### Уведомления
- Уведомления о предстоящих списаниях
- Настройки уведомлений (включение/выключение)
- Счётчик непрочитанных

### Кроссплатформенность
- **Web** — React SPA с космическим дизайном
- **iOS** — нативное SwiftUI-приложение с Swift Charts
- **Android** — нативное Jetpack Compose с Material 3
- Единый backend, синхронизация данных между всеми платформами

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        Клиенты                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │ Web (SPA)│   │   iOS    │   │ Android  │   │ Flex Bank UI │ │
│  │  React   │   │ SwiftUI  │   │ Compose  │   │    React     │ │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────┬───────┘ │
└───────┼──────────────┼──────────────┼─────────────────┼─────────┘
        │              │              │                 │
        ▼              ▼              ▼                 ▼
┌───────────────────────────────┐  ┌───────────────────────────┐
│     SpaceSub API (NestJS)     │  │   Flex Bank API (NestJS)  │
│  ┌──────────────────────┐     │  │  ┌─────────────────────┐  │
│  │ Auth (Yandex OAuth)  │     │  │  │ Auth (Yandex OAuth) │  │
│  │ Bank Integration     │◄────┼──┤  │ Accounts & Tx       │  │
│  │ Subscription Analyzer│     │  │  │ Recurring Payments   │  │
│  │ Analytics Engine     │     │  │  │ Service Catalog (101)│  │
│  │ Forecast Engine      │     │  │  │ User Subscriptions   │  │
│  │ Notifications        │     │  │  └─────────────────────┘  │
│  └──────────────────────┘     │  └───────────┬───────────────┘
└───────────────┬───────────────┘              │
                │                              │
                ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Railway)                       │
│          ┌──────────────┐   ┌──────────────┐                │
│          │ public schema│   │mockbank schema│                │
│          │  (SpaceSub)  │   │  (Flex Bank)  │                │
│          └──────────────┘   └──────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Поток авторизации

```
Пользователь → SpaceSub → Yandex OAuth → JWT токен → Доступ к API
                                │
Пользователь → Подключить банк → Yandex OAuth → Flex Bank Token Exchange
                                                        │
                                            Зашифрованный токен (AES-256-GCM)
                                                        │
                                            Синхронизация транзакций + подписок
```

---

## Структура монорепозитория

```
SpaceSub/
├── backend/                  # SpaceSub API — NestJS
│   ├── src/
│   │   ├── auth/             #   Yandex OAuth, JWT, стратегии
│   │   ├── users/            #   Управление пользователями
│   │   ├── subscriptions/    #   Ручное управление подписками
│   │   ├── bank-integration/ #   OAuth банка, синхронизация, анализатор
│   │   ├── detected-subscriptions/ # Автообнаруженные подписки
│   │   ├── analytics/        #   Аналитика (6 эндпоинтов)
│   │   ├── forecast/         #   Прогнозирование расходов
│   │   ├── notifications/    #   Уведомления
│   │   └── transactions/     #   Импортированные транзакции
│   └── prisma/               #   Схема и миграции (public)
│
├── mock-bank/                # Flex Bank API — NestJS
│   ├── src/
│   │   ├── auth/             #   OAuth + token exchange
│   │   ├── accounts/         #   Банковские счета
│   │   ├── transactions/     #   Генерация транзакций
│   │   ├── recurring-payments/   # Рекуррентные платежи
│   │   ├── service-catalog/  #   Каталог 101 сервиса
│   │   ├── user-subscriptions/   # Подписки пользователей
│   │   ├── connection-code/  #   Коды подключения (FB-XXXXXX)
│   │   └── api-v1/          #   Версионированные эндпоинты
│   └── prisma/               #   Схема и миграции (mockbank)
│
├── spacesub-frontend/        # Основной веб-клиент — React + Vite
│   └── src/
│       ├── pages/            #   Login, Dashboard, Subscriptions,
│       │                     #   Analytics, Forecast, Notifications
│       ├── components/       #   UI-компоненты
│       └── services/         #   API-клиент (axios)
│
├── flex-bank-frontend/       # Интерфейс банка — React + Vite
│   └── src/
│       ├── pages/            #   Login, Dashboard, Account,
│       │                     #   Transactions, Analytics, Subscriptions
│       └── components/       #   UI-компоненты (космический дизайн)
│
├── ios-SpaceSub/             # iOS-приложение — SwiftUI
│   └── ios-SpaceSub/
│       ├── Views/            #   Dashboard, Subscriptions, Analytics,
│       │                     #   Forecast, Notifications, ConnectFlex
│       ├── Networking/       #   APIClient (REST)
│       └── Auth/             #   YandexAuthManager, TokenManager
│
├── android-SpaceSub/         # Android-приложение — Jetpack Compose
│   └── app/src/main/java/dev/squad52/spacesub/
│       ├── ui/screens/       #   Dashboard, Subscriptions, Analytics,
│       │                     #   Forecast, Notifications, ConnectFlex
│       ├── networking/       #   RetrofitClient, ApiService
│       └── auth/             #   YandexAuthHelper, TokenManager
│
└── scripts/                  # Скрипты для туннелей и деплоя
```

---

## Технологический стек

### Backend

| Технология | Версия | Назначение |
|-----------|--------|------------|
| Node.js | >= 20 | Среда выполнения |
| NestJS | 11 | Фреймворк backend |
| Prisma | 6 | ORM и миграции |
| PostgreSQL | 16 | База данных |
| Passport + JWT | — | Аутентификация |
| Swagger | — | Документация API |
| axios + axios-retry | — | HTTP-клиент с ретраями |

### Web-клиенты

| Технология | Версия | Назначение |
|-----------|--------|------------|
| React | 19 | UI-библиотека |
| Vite | 7 | Сборщик |
| TypeScript | 5 | Типизация |
| Tailwind CSS | 4 | Стилизация |
| Framer Motion | 12 | Анимации |
| Recharts | 3 | Графики и диаграммы |
| react-countup | 6 | Анимация чисел |

### iOS

| Технология | Назначение |
|-----------|------------|
| SwiftUI | UI-фреймворк |
| Swift Charts | Графики (SectorMark, AreaMark, BarMark) |
| ASWebAuthenticationSession | OAuth в браузере |
| Keychain | Хранение JWT-токенов |

### Android

| Технология | Назначение |
|-----------|------------|
| Jetpack Compose | UI-фреймворк |
| Material 3 | Дизайн-система |
| Retrofit 2 + OkHttp | HTTP-клиент |
| Navigation Compose | Навигация |
| EncryptedSharedPreferences | Безопасное хранение токенов |
| Chrome Custom Tabs | OAuth в браузере |

### Инфраструктура

| Сервис | Назначение |
|--------|------------|
| Railway | Хостинг backend + PostgreSQL |
| Vercel | Хостинг фронтендов (с rewrites на API) |

---

## Требования

- **Node.js** >= 20.0.0
- **npm** >= 10
- **PostgreSQL** >= 14
- **Xcode** >= 16 (для iOS)
- **Android Studio** с Kotlin и Compose (для Android)
- **Аккаунт Yandex** для OAuth

---

## Установка и запуск

### 1. Клонирование и зависимости

```bash
git clone https://github.com/your-repo/SpaceSub.git
cd SpaceSub

# Установка зависимостей для всех сервисов
npm install                      # корневые (concurrently)
cd backend && npm install && cd ..
cd mock-bank && npm install && cd ..
cd spacesub-frontend && npm install && cd ..
cd flex-bank-frontend && npm install && cd ..
```

### 2. База данных

Создайте базу данных PostgreSQL:

```bash
# Через psql
psql -U postgres
CREATE DATABASE spacesub;
CREATE USER spacesub WITH PASSWORD 'spacesub';
GRANT ALL PRIVILEGES ON DATABASE spacesub TO spacesub;
\q
```

Оба backend-сервиса используют **одну БД**, но разные схемы:
- `public` — SpaceSub (основное приложение)
- `mockbank` — Flex Bank (симуляция банка)

### 3. Yandex OAuth

1. Перейдите на [Yandex OAuth](https://oauth.yandex.ru/) и создайте **два приложения**:

   **Приложение SpaceSub:**
   - Redirect URI: `http://localhost:5174/api/auth/yandex/callback`
   - Права: `login:info`, `login:email`, `login:avatar`

   **Приложение Flex Bank:**
   - Redirect URI: `http://localhost:3001/auth/yandex/callback`
   - Права: `login:info`, `login:email`

2. Запишите `Client ID` и `Client Secret` для каждого приложения.

### 4. Переменные окружения

**Backend** — скопируйте и заполните:

```bash
cp backend/.env.example backend/.env
```

```env
DATABASE_URL="postgresql://spacesub:spacesub@localhost:5432/spacesub?schema=public"
JWT_SECRET=your-secret-key-here
PORT=3000
FRONTEND_URL=http://localhost:5174

# Yandex OAuth (приложение SpaceSub)
YANDEX_CLIENT_ID=your-spacesub-client-id
YANDEX_CLIENT_SECRET=your-spacesub-client-secret
YANDEX_REDIRECT_URI=http://localhost:5174/api/auth/yandex/callback

# Flex Bank connection
FLEX_BANK_BASE_URL=http://localhost:3001
FLEX_BANK_TIMEOUT_MS=8000
FLEX_BANK_OAUTH_CLIENT_ID=your-flex-bank-client-id
FLEX_BANK_OAUTH_CLIENT_SECRET=your-flex-bank-client-secret
FLEX_BANK_OAUTH_REDIRECT_URI=http://localhost:5174/api/bank-integration/flex/callback

# Шифрование токенов (сгенерировать: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN_ENCRYPTION_KEY=your-64-char-hex-string
```

**Mock Bank** — скопируйте и заполните:

```bash
cp mock-bank/.env.example mock-bank/.env
```

```env
DATABASE_URL="postgresql://spacesub:spacesub@localhost:5432/spacesub"
JWT_SECRET=another-secret-key-here
PORT=3001
FRONTEND_URL=http://localhost:5173

# Yandex OAuth (приложение Flex Bank)
YANDEX_CLIENT_ID=your-flex-bank-client-id
YANDEX_CLIENT_SECRET=your-flex-bank-client-secret
YANDEX_REDIRECT_URI=http://localhost:3001/auth/yandex/callback

TOKEN_ENCRYPTION_KEY=your-64-char-hex-string
```

### 5. Миграции и seed

```bash
# SpaceSub backend — миграции
cd backend
npx prisma migrate deploy
cd ..

# Mock Bank — миграции + заполнение каталога (101 сервис)
cd mock-bank
npx prisma migrate deploy
npx prisma db seed
cd ..
```

### 6. Запуск в dev-режиме

```bash
# Запустить все 4 сервиса одной командой (из корня)
npm run dev
```

Это запустит:
| Сервис | URL | Порт |
|--------|-----|------|
| SpaceSub API | http://localhost:3000/api | 3000 |
| Flex Bank API | http://localhost:3001 | 3001 |
| Flex Bank Frontend | http://localhost:5173 | 5173 |
| SpaceSub Frontend | http://localhost:5174 | 5174 |

Либо можно запускать по отдельности:

```bash
npm run dev:backends    # Только оба backend
npm run dev:frontends   # Только оба frontend

# Или каждый сервис отдельно:
cd backend && npm run start:dev
cd mock-bank && npm run start:dev
cd spacesub-frontend && npm run dev
cd flex-bank-frontend && npm run dev
```

### 7. Сборка iOS

```bash
cd ios-SpaceSub
open ios-SpaceSub.xcodeproj
```

1. Откройте проект в Xcode
2. Выберите целевое устройство (iPhone или Simulator)
3. Нажмите **Cmd + R** для сборки и запуска
4. Deep link: `spacesub://auth/callback?token=JWT`

> **Примечание:** для локальной разработки измените `apiBaseURL` в `Configuration.swift` на `http://localhost:3000/api`

### 8. Сборка Android

```bash
cd android-SpaceSub
```

1. Откройте проект в **Android Studio**
2. Синхронизируйте Gradle
3. Выберите устройство или эмулятор (minSdk 28, Android 9+)
4. Нажмите **Run** (зелёная кнопка)
5. Deep link: `spacesub://auth/callback?token=JWT`

> **Примечание:** для локальной разработки с эмулятором используйте `10.0.2.2` вместо `localhost` в `RetrofitClient.kt`

---

## Деплой

### Railway (backends)

Оба backend деплоятся на Railway при пуше в `main`:

```bash
# Конфигурация в railway.json каждого сервиса
# Backend: healthcheck /api, start: prisma migrate deploy && node dist/main.js
# Mock Bank: healthcheck /health, start: npm run migrate && node dist/main.js
```

Переменные окружения задаются в Railway Dashboard для каждого сервиса.

### Vercel (frontends)

Оба фронтенда деплоятся на Vercel при пуше в `main`:

- **SpaceSub Frontend** — rewrites `/api/*` → Railway backend
- **Flex Bank Frontend** — rewrites `/bank-api/*` → Railway mock-bank

### Сборка production

```bash
# Сборка всех сервисов
npm run build:all

# Или по отдельности
cd backend && npm run build
cd mock-bank && npm run build
cd spacesub-frontend && npm run build
cd flex-bank-frontend && npm run build
```

---

## API документация

После запуска backend доступен **Swagger UI**:

| Сервис | Swagger URL |
|--------|------------|
| SpaceSub API | http://localhost:3000/api/docs |
| Flex Bank API | http://localhost:3001/api/docs |

### Основные эндпоинты SpaceSub

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/auth/yandex` | Начать OAuth авторизацию |
| `GET` | `/api/subscriptions` | Список подписок пользователя |
| `GET` | `/api/detected-subscriptions` | Автообнаруженные подписки |
| `GET` | `/api/analytics/overview` | Общая аналитика расходов |
| `GET` | `/api/analytics/by-category` | Расходы по категориям |
| `GET` | `/api/analytics/by-service` | Расходы по сервисам |
| `GET` | `/api/analytics/by-period` | Динамика расходов по периодам |
| `GET` | `/api/analytics/scores` | Скоринг здоровья подписок |
| `GET` | `/api/analytics/recommendations` | Персональные рекомендации |
| `GET` | `/api/forecast` | Прогноз расходов |
| `GET` | `/api/notifications` | Уведомления пользователя |
| `POST` | `/api/bank-integration/flex/oauth` | Подключить банк |
| `POST` | `/api/bank-integration/sync` | Синхронизировать данные |

### Основные эндпоинты Flex Bank

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/v1/accounts` | Счета пользователя |
| `GET` | `/api/v1/accounts/:id/transactions` | Транзакции по счёту |
| `GET` | `/api/v1/recurring-payments` | Рекуррентные платежи |
| `GET` | `/api/v1/services` | Каталог сервисов (101 шт.) |
| `POST` | `/api/v1/services/:id/subscribe` | Подписаться на сервис |
| `POST` | `/api/v1/services/:id/unsubscribe` | Отменить подписку |
| `GET` | `/api/v1/my-subscriptions` | Подписки пользователя |

---

## Переменные окружения

### Backend (SpaceSub API)

| Переменная | Обязательная | Описание |
|-----------|:---:|----------|
| `DATABASE_URL` | Да | PostgreSQL connection string |
| `JWT_SECRET` | Да | Секрет для подписи JWT |
| `PORT` | Нет | Порт сервера (по умолчанию 3000) |
| `FRONTEND_URL` | Да | URL фронтенда для редиректов |
| `YANDEX_CLIENT_ID` | Да | Client ID приложения Yandex OAuth |
| `YANDEX_CLIENT_SECRET` | Да | Client Secret приложения Yandex OAuth |
| `YANDEX_REDIRECT_URI` | Да | Redirect URI для OAuth callback |
| `FLEX_BANK_BASE_URL` | Да | URL Flex Bank API |
| `FLEX_BANK_TIMEOUT_MS` | Нет | Таймаут запросов к банку (по умолчанию 8000) |
| `FLEX_BANK_OAUTH_CLIENT_ID` | Да | Client ID для OAuth банка |
| `FLEX_BANK_OAUTH_CLIENT_SECRET` | Да | Client Secret для OAuth банка |
| `FLEX_BANK_OAUTH_REDIRECT_URI` | Да | Redirect URI для callback банка |
| `TOKEN_ENCRYPTION_KEY` | Да | 64 hex символа для AES-256-GCM |

### Mock Bank (Flex Bank API)

| Переменная | Обязательная | Описание |
|-----------|:---:|----------|
| `DATABASE_URL` | Да | PostgreSQL connection string (та же БД) |
| `JWT_SECRET` | Да | Секрет для подписи JWT (отличный от SpaceSub) |
| `PORT` | Нет | Порт сервера (по умолчанию 3001) |
| `FRONTEND_URL` | Да | URL фронтенда Flex Bank |
| `YANDEX_CLIENT_ID` | Да | Client ID приложения Yandex OAuth |
| `YANDEX_CLIENT_SECRET` | Да | Client Secret приложения Yandex OAuth |
| `YANDEX_REDIRECT_URI` | Да | Redirect URI для OAuth callback |
| `TOKEN_ENCRYPTION_KEY` | Да | 64 hex символа для AES-256-GCM |

---

## Схема базы данных

### SpaceSub (public schema)

```
User                    Subscription           DetectedSubscription
├── id                  ├── id                 ├── id
├── yandexId            ├── userId ──► User    ├── userId ──► User
├── email               ├── name               ├── merchant
├── displayName         ├── amount             ├── normalizedMerchant
├── avatarUrl           ├── currency           ├── amount / currency
└── createdAt           ├── billingCycle       ├── periodType
                        └── nextPaymentDate    ├── confidence (0.0–1.0)
                                               ├── lastChargeDate
BankConnection          ImportedTransaction    ├── nextExpectedCharge
├── id                  ├── id                 ├── transactionCount
├── userId ──► User     ├── userId ──► User    └── isActive
├── bankType            ├── merchant
├── encryptedToken      ├── amount / currency  Notification
├── status              ├── category           ├── id
└── lastSyncAt          └── occurredAt         ├── userId ──► User
                                               ├── title / message
                                               ├── type
                                               └── isRead
```

### Flex Bank (mockbank schema)

```
User                    Account                Transaction
├── id                  ├── id                 ├── id
├── yandexId            ├── userId ──► User    ├── accountId ──► Account
├── email               ├── name               ├── amount / currency
└── displayName         ├── balance            ├── merchant
                        └── currency           ├── category
                                               └── occurredAt
ServiceCatalog          UserSubscription       RecurringPayment
├── id                  ├── id                 ├── id
├── name                ├── userId ──► User    ├── accountId ──► Account
├── merchant            ├── serviceId ──► SC   ├── merchant
├── description         ├── accountId          ├── amount / currency
├── logoUrl             ├── status             ├── periodDays
├── amount / currency   ├── subscribedAt       ├── status
├── periodDays          └── cancelledAt        ├── nextChargeDate
└── category                                   └── cancelledAt
```

---

## Команда

Разработано командой **Squad 52** в рамках хакатона «Цифровой вызов 2026» (отборочный этап «Фулстэк»).
