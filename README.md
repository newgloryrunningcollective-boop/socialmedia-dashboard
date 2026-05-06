# Social Media Dashboard

Next.js dashboard voor social analytics, planning en platformkoppelingen.

## Lokale setup

```bash
npm install
npm run dev
```

Open daarna `http://localhost:3000`.

Kopieer `.env.example` naar `.env.local` en vul de platformwaarden in. `.env.local` blijft bewust buiten Git.

## OAuth callback URLs

Gebruik lokaal deze redirect URLs in de developer portals:

- Meta: `http://localhost:3000/api/connect/meta/callback`
- LinkedIn: `http://localhost:3000/api/connect/linkedin/callback`

Gebruik voor productie dezelfde paden op de Vercel-domain:

- Meta: `https://socialmedia-dashboard-phi.vercel.app/api/connect/meta/callback`
- LinkedIn: `https://socialmedia-dashboard-phi.vercel.app/api/connect/linkedin/callback`
- TikTok: `https://socialmedia-dashboard-phi.vercel.app/api/connect/tiktok/callback`

TikTok Web Login accepteert alleen HTTPS redirect URIs. Gebruik daarom de Vercel callback hierboven, of een HTTPS tunnel als je lokaal wilt testen.

## Huidige koppelingen

- Meta OAuth start via `/api/connect/meta`.
- Meta callback haalt Facebook Pages en gekoppelde Instagram Business Accounts op.
- Meta metrics endpoint leest tijdelijke page-token data uit een httpOnly cookie via `/api/meta/metrics`.
- LinkedIn OAuth start via `/api/connect/linkedin`.
- LinkedIn callback haalt profielinformatie en admin-organisaties op.
- LinkedIn identity endpoint leest de tijdelijke identity cookie via `/api/linkedin/metrics`.
- TikTok OAuth start via `/api/connect/tiktok`.
- TikTok callback bewaart tijdelijk access/refresh token data in een httpOnly cookie.
- TikTok metrics endpoint haalt profielinformatie en recente video's op via `/api/tiktok/metrics`.

## Vercel

De GitHub-repo is gekoppeld aan Vercel project `socialmedia-dashboard`.

- Framework: Next.js
- Productiedomain: `https://socialmedia-dashboard-phi.vercel.app`
- Vercel Node runtime: `24.x`

Zet dezelfde env vars uit `.env.example` ook in Vercel voor Production en Preview.

## Nog te doen

- Vervang tijdelijke cookie-opslag door database-opslag met versleutelde tokens.
- Voeg token refresh/expiry handling toe per platform.
- Koppel dashboard-KPI's aan `/api/meta/metrics`, `/api/linkedin/metrics` en `/api/tiktok/metrics`.
- Bouw YouTube/X routes pas nadat de basisopslag voor tokens staat.
