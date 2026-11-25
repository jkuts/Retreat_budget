# Retreat budget – notes for Claude

- Live site: https://retreat-budget.vercel.app (Vercel project `retreat-budget`). Pushing to `main` deploys to production.
- No build step and no dependencies: `index.html` is the whole front end; `api/items.js` is one Vercel function.
- Data lives in Upstash Redis (env vars `KV_REST_API_URL` / `KV_REST_API_TOKEN`, set by the Vercel integration):
  - hash `retreat:items` – field = item id, value = item JSON
  - hash `retreat:meta` – `budget` (default 330000 KRW), `seeded`
- Friends are using the live list: never change the Redis key names or item shape without migrating existing data.
- Free Upstash plan is 500K commands/month. Each page refresh costs 2 commands and the page polls every 3 s while visible, so be careful about adding commands per request.
- Amounts are Korean won, whole numbers, shown as `₩330,000`.
