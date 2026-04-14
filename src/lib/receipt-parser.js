const categoryRules = [
  { category: "Food & Dining", keywords: ["restaurant", "cafe", "coffee", "pizza", "bar", "food", "dining"] },
  { category: "Transport", keywords: ["uber", "taxi", "train", "bus", "fuel", "petrol", "parking"] },
  { category: "Travel", keywords: ["hotel", "flight", "airways", "booking", "airbnb"] },
  { category: "Utilities", keywords: ["electric", "water", "gas", "internet", "utility"] },
  { category: "Office Supplies", keywords: ["stationery", "office", "printer", "notebook"] },
  { category: "Healthcare", keywords: ["pharmacy", "clinic", "hospital", "health"] },
  { category: "Entertainment", keywords: ["cinema", "movie", "netflix", "spotify", "concert"] },
];

const detectCategory = (text) => {
  const lowered = text.toLowerCase();
  const matched = categoryRules.find(({ keywords }) =>
    keywords.some((keyword) => lowered.includes(keyword)),
  );
  return matched?.category ?? "Other";
};

const detectCurrency = (text) => {
  if (/[£]/.test(text)) return "GBP";
  if (/[€]/.test(text)) return "EUR";
  if (/[₹]/.test(text)) return "INR";
  if (/[¥]/.test(text)) return "JPY";
  if (/\$/.test(text)) return "USD";
  return "GBP";
};

const parseDate = (text) => {
  const patterns = [
    /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/,
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const values = match.slice(1).map(Number);
    if (pattern === patterns[0]) {
      const [year, month, day] = values;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    const [day, month, rawYear] = values;
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
};

const parseAmounts = (text) => {
  const amountMatches = [...text.matchAll(/\b\d{1,4}(?:[.,]\d{2})\b/g)]
    .map((match) => Number(match[0].replace(",", ".")))
    .filter((amount) => Number.isFinite(amount));

  const amount = amountMatches.length ? Math.max(...amountMatches) : 0;

  const vatMatch = text.match(/\b(?:vat|tax)\D{0,8}(\d{1,4}(?:[.,]\d{2})?)\b/i);
  const vat = vatMatch ? Number(vatMatch[1].replace(",", ".")) : undefined;

  return { amount, vat };
};

const parseVendor = (text) => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const firstUseful = lines.find((line) => !/\d/.test(line) && line.length > 2);
  return firstUseful ?? "Receipt Purchase";
};

export const parseReceiptText = (text) => {
  const clean = text.replace(/\s+/g, " ").trim();
  const { amount, vat } = parseAmounts(clean);
  const vendor = parseVendor(text);
  return {
    title: vendor,
    vendor,
    amount,
    vat,
    date: parseDate(clean),
    category: detectCategory(clean),
    currency: detectCurrency(clean),
  };
};
