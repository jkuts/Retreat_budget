// Shared storage for the retreat budget, backed by Upstash Redis (Vercel Marketplace).
// Needs env vars from the Upstash integration: KV_REST_API_URL + KV_REST_API_TOKEN
// (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ITEMS = "retreat:items";
const META = "retreat:meta";

const SEED = [
  ["Pork belly (samgyeopsal), kg", "Meat", 2, 28000, "BBQ night 1"],
  ["Pork neck (moksal), kg", "Meat", 1, 26000, ""],
  ["Lettuce & perilla leaves", "Produce", 2, 6000, "For ssam"],
  ["Kimchi", "Staples", 1, 15000, ""],
  ["Rice, 4kg bag", "Staples", 1, 16000, ""],
  ["Ramyeon 5-pack", "Staples", 2, 4500, "Late-night / hangover breakfast"],
  ["Eggs, 30", "Staples", 1, 9000, ""],
  ["Bread & jam", "Staples", 1, 8000, "Breakfast"],
  ["Fruit", "Produce", 1, 20000, ""],
  ["Snacks & chips", "Snacks", 1, 25000, ""],
  ["Soju", "Drinks", 10, 1800, ""],
  ["Beer 6-pack", "Drinks", 3, 11000, ""],
  ["Soft drinks & water", "Drinks", 1, 15000, ""],
  ["Charcoal & grill supplies", "Supplies", 1, 20000, ""],
  ["Plates, cups, foil, bags", "Supplies", 1, 12000, ""],
  ["Ssamjang, salt, oil, sauces", "Staples", 1, 10000, ""],
];

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const clean = (s, n = 120) => String(s ?? "").slice(0, n);
const num = (v, max = 1e9) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.min(x, max) : 0; };

function sanitize(it) {
  return {
    id: clean(it.id, 40),
    name: clean(it.name),
    category: clean(it.category, 30),
    qty: num(it.qty),
    price: num(it.price),
    who: clean(it.who, 40),
    bought: !!it.bought,
    notes: clean(it.notes, 300),
    order: num(it.order, 1e15),
    updated: Date.now(),
  };
}

async function readAll() {
  let meta = await redis(["HGETALL", META]);
  if (!meta || meta.length === 0) {
    // First run: seed the starter list.
    const cmd = ["HSET", ITEMS];
    SEED.forEach(([name, category, qty, price, notes], i) => {
      const id = "seed" + i;
      cmd.push(id, JSON.stringify(sanitize({ id, name, category, qty, price, notes, order: i })));
    });
    await redis(cmd);
    await redis(["HSET", META, "budget", "330000", "seeded", "1"]);
    meta = ["budget", "330000"];
  }
  const m = {};
  for (let i = 0; i < meta.length; i += 2) m[meta[i]] = meta[i + 1];
  const raw = (await redis(["HGETALL", ITEMS])) || [];
  const items = [];
  for (let i = 0; i < raw.length; i += 2) {
    try { items.push(JSON.parse(raw[i + 1])); } catch {}
  }
  items.sort((a, b) => a.order - b.order);
  return { budget: Number(m.budget) || 330000, items };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) {
    return res.status(500).json({ error: "Database not connected. Add Upstash Redis to this Vercel project." });
  }
  try {
    if (req.method === "GET") return res.json(await readAll());
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (body.op === "upsert" && body.item && body.item.id) {
        const it = sanitize(body.item);
        await redis(["HSET", ITEMS, it.id, JSON.stringify(it)]);
      } else if (body.op === "delete" && body.id) {
        await redis(["HDEL", ITEMS, clean(body.id, 40)]);
      } else if (body.op === "budget") {
        await redis(["HSET", META, "budget", String(num(body.budget))]);
      } else {
        return res.status(400).json({ error: "Unknown op" });
      }
      return res.json(await readAll());
    }
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
