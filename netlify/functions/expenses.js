import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const STORE_NAME = "expensly";
const RECORD_KEY = "expenses.json";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
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

const LOCAL_DATA_PATH = path.resolve(process.cwd(), ".netlify", "expenses.local.json");

const getPersistence = () => {
  try {
    return { type: "blob", store: getStore(STORE_NAME) };
  } catch {
    return { type: "file" };
  }
};

const readExpensesFromFile = async () => {
  try {
    const raw = await fs.readFile(LOCAL_DATA_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeExpensesToFile = async (expenses) => {
  await fs.mkdir(path.dirname(LOCAL_DATA_PATH), { recursive: true });
  await fs.writeFile(LOCAL_DATA_PATH, JSON.stringify(expenses, null, 2), "utf8");
};

const readExpenses = async (persistence) => {
  if (persistence.type === "blob") {
    const stored = await persistence.store.get(RECORD_KEY, { type: "json" });
    if (!stored || !Array.isArray(stored)) return [];
    return stored;
  }

  const stored = await readExpensesFromFile();
  if (!stored || !Array.isArray(stored)) return [];
  return stored;
};

const writeExpenses = async (persistence, expenses) => {
  if (persistence.type === "blob") {
    await persistence.store.setJSON(RECORD_KEY, expenses);
    return;
  }

  await writeExpensesToFile(expenses);
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  const persistence = getPersistence();
  const params = event.queryStringParameters ?? {};

  try {
    if (event.httpMethod === "GET") {
      const all = await readExpenses(persistence);
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
      const all = await readExpenses(persistence);
      const next = normalizeExpense(payload);
      all.push(next);
      await writeExpenses(persistence, all);
      return json(201, { data: next });
    }

    if (event.httpMethod === "PUT") {
      const id = params.id;
      if (!id) return json(400, { error: "Missing id query parameter" });
      const patch = JSON.parse(event.body ?? "{}");
      const all = await readExpenses(persistence);
      const index = all.findIndex((expense) => expense.id === id);
      if (index === -1) return json(404, { error: "Expense not found" });
      const updated = normalizeExpense({ ...all[index], ...patch, id });
      all[index] = updated;
      await writeExpenses(persistence, all);
      return json(200, { data: updated });
    }

    if (event.httpMethod === "DELETE") {
      const id = params.id;
      if (!id) return json(400, { error: "Missing id query parameter" });
      const all = await readExpenses(persistence);
      const filtered = all.filter((expense) => expense.id !== id);
      await writeExpenses(persistence, filtered);
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("expenses function failed", error);
    return json(500, { error: "Failed to process expense request" });
  }
};
