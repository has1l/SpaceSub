# SpaceSub Frontend

Space-themed subscription aggregator UI built with React + Vite + TypeScript + Tailwind CSS.

## Prerequisites

### Local DNS aliases

Add to `/etc/hosts` (most modern browsers resolve `*.localhost` automatically, but add this if needed):

```
127.0.0.1 spacesub.localhost
127.0.0.1 flexbank.localhost
```

SpaceSub backend must be running at http://spacesub.localhost:3000:

```bash
cd ../backend
npm run start:dev
```

## Quick Start

```bash
npm install
npm run dev
```

Open http://spacesub.localhost:5174

## Auth Flow

1. Click "Войти через Яндекс" → redirects to `http://spacesub.localhost:3000/auth/yandex`
2. Backend redirects to Yandex OAuth (with `prompt=select_account`)
3. After auth, backend redirects to `http://spacesub.localhost:5174/auth/callback?token=JWT`
4. Token saved to `localStorage` as `spacesub_token`

OAuth uses `spacesub.localhost` domain to avoid cookie/session conflicts with Flex Bank (`flexbank.localhost`).

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
