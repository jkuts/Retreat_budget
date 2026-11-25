# Retreat Food & Shopping Budget

A shared, live-editing shopping list for a group retreat with a ₩330,000 budget.
Live at https://retreat-budget.vercel.app

- `index.html` – the page (no build step, no dependencies)
- `api/items.js` – Vercel function that stores the list in Upstash Redis
  (uses the `KV_REST_API_URL` / `KV_REST_API_TOKEN` env vars from the Vercel Upstash integration)

The page polls `/api/items` every 3 seconds while visible. Each refresh costs 2 Redis commands.
