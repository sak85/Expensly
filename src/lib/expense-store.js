import netlifyIdentity from "netlify-identity-widget";
const API_ENDPOINT = "/.netlify/functions/expenses";

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

const api = async (path = "", options = {}) => {
  const token = await netlifyIdentity.currentUser()?.jwt();
  const response = await fetch(`${API_ENDPOINT}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Expense API request failed (${response.status})`);
  }

  return response.json();
};

export const expenseStore = {
  async list() {
    const result = await api();
    return result.data ?? [];
  },

  async getById(id) {
    const result = await api(`?id=${encodeURIComponent(id)}`);
    return result.data ?? null;
  },

  async create(data) {
    const next = normalizeExpense(data);
    const result = await api("", {
      method: "POST",
      body: JSON.stringify(next),
    });
    return result.data;
  },

  async update(id, patch) {
    const merged = normalizeExpense({
      ...(await this.getById(id)),
      ...patch,
      id,
    });
    const result = await api(`?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(merged),
    });
    return result.data;
  },

  async remove(id) {
    await api(`?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
