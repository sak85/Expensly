import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
const STORE_NAME = "expensly";
const LOCAL_DATA_ROOT = path.resolve(process.cwd(), ".netlify", "data");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  },
  body: JSON.stringify(body),
});

const normalizeExpense = (expense) => ({
  id: expense.id ?? crypto.randomUUID(),
  title: expense.title ?? "",
  amount: Number(expense.amount) || 0,
  vat:
    expense.vat === undefined || expense.vat === null || expense.vat === ""
      ? undefined
      : Number(expense.vat),
  date: expense.date ?? new Date().toISOString().split("T")[0],
  category: expense.category ?? "",
  receipt_url: expense.receipt_url ?? "",
  notes: expense.notes ?? "",
  vendor: expense.vendor ?? "",
  currency: expense.currency ?? "GBP",
  archived: Boolean(expense.archived),
  created_at: expense.created_at ?? new Date().toISOString(),
});

const getUserContext = async (event) => {
  const identityUser = event.clientContext?.user;
  if (identityUser?.sub) {
    return { id: identityUser.sub, email: identityUser.email ?? null };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    try {
      const origin =
        process.env.URL || `https://${event.headers?.["x-forwarded-host"] || event.headers?.host}`;
      const response = await fetch(`${origin}/.netlify/identity/user`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const profile = await response.json();
        if (profile?.id) {
          return { id: profile.id, email: profile.email ?? null };
        }
      }
    } catch (error) {
      console.error("Failed to validate Netlify Identity token", error);
    }
  }

  if (process.env.NETLIFY_LOCAL === "true") {
    return { id: "local-dev-user", email: "local@example.com" };
  }
  return null;
};

const getUserRecordKey = (userId) => `users/${userId}/expenses.json`;

const readLocalExpenses = async (userId) => {
  try {
    const localPath = path.join(LOCAL_DATA_ROOT, `${userId}.json`);
    const raw = await fs.readFile(localPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalExpenses = async (userId, expenses) => {
  await fs.mkdir(LOCAL_DATA_ROOT, { recursive: true });
  const localPath = path.join(LOCAL_DATA_ROOT, `${userId}.json`);
  await fs.writeFile(localPath, JSON.stringify(expenses, null, 2), "utf8");
};

const readExpenses = async (store, userId) => {
  if (!store) return readLocalExpenses(userId);
  const stored = await store.get(getUserRecordKey(userId), { type: "json" });
  if (!stored || !Array.isArray(stored)) return [];
  return stored;
};

const writeExpenses = async (store, userId, expenses) => {
  if (!store) {
    await writeLocalExpenses(userId, expenses);
    return;
  }
  await store.setJSON(getUserRecordKey(userId), expenses);
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  const user = await getUserContext(event);
  if (!user) {
    return json(401, { error: "Authentication required" });
  }

  let store = null;
  try {
    store = getStore(STORE_NAME);
  } catch (error) {
    if (process.env.NETLIFY_LOCAL !== "true") {
      console.error("Unable to initialize Netlify Blobs", error);
      return json(500, { error: "Storage is not configured" });
    }
  }

  const params = event.queryStringParameters ?? {};

  try {
    if (event.httpMethod === "GET") {
      const all = await readExpenses(store, user.id);
      const id = params.id;
      if (id) {
        const found = all.find((expense) => expense.id === id);
        return json(200, { data: found ?? null });
      }
      const sorted = all.sort((a, b) => (a.date < b.date ? 1 : -1));
      return json(200, { data: sorted });
    }

    if (event.httpMethod === "POST") {
      const payload = JSON.parse(event.body ?? "{}");
      const all = await readExpenses(store, user.id);
      const next = normalizeExpense(payload);
      all.push(next);
      await writeExpenses(store, user.id, all);
      return json(201, { data: next });
    }

    if (event.httpMethod === "PUT") {
      const id = params.id;
      if (!id) return json(400, { error: "Missing id query parameter" });
      const patch = JSON.parse(event.body ?? "{}");
      const all = await readExpenses(store, user.id);
      const index = all.findIndex((expense) => expense.id === id);
      if (index === -1) return json(404, { error: "Expense not found" });
      const updated = normalizeExpense({ ...all[index], ...patch, id });
      all[index] = updated;
      await writeExpenses(store, user.id, all);
      return json(200, { data: updated });
    }

    if (event.httpMethod === "DELETE") {
      const id = params.id;
      if (!id) return json(400, { error: "Missing id query parameter" });
      const all = await readExpenses(store, user.id);
      const filtered = all.filter((expense) => expense.id !== id);
      await writeExpenses(store, user.id, filtered);
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("expenses function failed", error);
    return json(500, { error: "Failed to process expense request" });
  }
};
