# Mock Bank API

Эмулятор банковского API для проекта **SpaceSub**. Позволяет создавать счета, генерировать транзакции и тестировать интеграцию с банковскими данными без подключения к реальным банкам.

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
- PostgreSQL 16

### 1. Установка

```bash
cd mock-bank
npm install
```

### 2. Настройка

```bash
cp .env.example .env
# Заполни .env своими значениями
```

### 3. База данных

```bash
# Создать БД (если нет)
psql -U postgres -c "CREATE USER mockbank WITH PASSWORD 'mockbank' CREATEDB;"
psql -U postgres -c "CREATE DATABASE mockbank OWNER mockbank;"

# Миграции
npm run prisma:generate
npm run prisma:migrate
```

### 4. Запуск

```bash
npm run start:dev
```

Сервер: `http://localhost:3001`
Swagger: `http://localhost:3001/api/docs`

### Docker Compose

```bash
docker compose up -d
```

## API Endpoints

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| `GET` | `/auth/yandex` | Редирект на Яндекс OAuth | - |
| `GET` | `/auth/yandex/callback` | Callback — возвращает JWT | - |
| `GET` | `/accounts` | Список счетов | JWT |
| `POST` | `/accounts` | Создать счёт | JWT |
| `GET` | `/accounts/:id/transactions` | Транзакции по счёту (фильтр from/to) | JWT |
| `POST` | `/accounts/:id/transactions` | Создать транзакцию | JWT |
| `GET` | `/transactions` | Все транзакции пользователя | JWT |

## Примеры запросов

```bash
# Создать счёт
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Основной","currency":"RUB","balance":100000}' \
  http://localhost:3001/accounts

# Создать транзакцию
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-15T00:00:00.000Z","amount":-799,"description":"NETFLIX.COM"}' \
  http://localhost:3001/accounts/{accountId}/transactions

# Получить транзакции с фильтром по дате
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/accounts/{accountId}/transactions?from=2026-01-01&to=2026-12-31"
```

## Структура проекта

```
mock-bank/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/
│   ├── auth/
│   │   ├── guards/
│   │   └── strategies/
│   ├── accounts/
│   │   └── dto/
│   └── transactions/
│       └── dto/
├── test/
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Тесты

```bash
# Unit-тесты
npm test

# E2E-тесты
npm run test:e2e
```
