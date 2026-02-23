# Flex Bank Frontend

Веб-интерфейс для Mock Bank API (проект SpaceSub).

## Стек

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- Axios
- React Router

## Запуск

```bash
npm install
npm run dev
```

Откроется на `http://localhost:5173`

## Требования

- Mock Bank API запущен на `http://localhost:3001`

## Страницы

| URL | Описание |
|-----|----------|
| `/` | Страница логина (Яндекс OAuth) |
| `/auth/callback` | Callback авторизации |
| `/dashboard` | Список счетов |
| `/accounts/:id` | Транзакции по счёту |

## Структура

```
src/
├── services/api.ts        # Axios instance
├── context/AuthContext.tsx # Auth state
├── hooks/useAuth.ts       # Auth hook
├── components/
│   ├── Layout.tsx         # Nav + layout
│   ├── ProtectedRoute.tsx # JWT guard
│   └── Spinner.tsx        # Loading
├── pages/
│   ├── LoginPage.tsx      # Login
│   ├── AuthCallback.tsx   # OAuth callback
│   ├── Dashboard.tsx      # Accounts list
│   └── AccountPage.tsx    # Account transactions
├── types.ts               # TypeScript types
├── App.tsx                # Router
└── main.tsx               # Entry
```
