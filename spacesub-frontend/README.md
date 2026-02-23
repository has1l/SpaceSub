# SpaceSub Frontend

Space-themed subscription aggregator UI built with React + Vite + TypeScript + Tailwind CSS.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Prerequisites

SpaceSub backend must be running at http://localhost:3000:

```bash
cd ../backend
npm run start:dev
```

## Auth Flow

1. Click "Войти через Яндекс" → redirects to backend `/auth/yandex`
2. Backend redirects to Yandex OAuth
3. After auth, backend redirects to `http://localhost:5173/auth/callback?token=JWT`
4. Token saved to `localStorage` as `spacesub_token`

## Pages

| Route | Description |
|-------|-------------|
| `/` | Login page |
| `/auth/callback` | OAuth callback handler |
| `/dashboard` | Bank connections (protected) |
| `/connect-flex` | Connect Flex Bank (protected) |

## Build

```bash
npm run build
```
