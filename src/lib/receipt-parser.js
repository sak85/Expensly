const categoryRules = [
  { category: "Food & Dining", keywords: ["restaurant", "cafe", "coffee", "pizza", "bar", "food", "dining"] },
  { category: "Transport", keywords: ["uber", "taxi", "train", "bus", "fuel", "petrol", "parking"] },
  { category: "Travel", keywords: ["hotel", "flight", "airways", "booking", "airbnb"] },
  { category: "Utilities", keywords: ["electric", "water", "gas", "internet", "utility"] },
  { category: "Office Supplies", keywords: ["stationery", "office", "printer", "notebook"] },
  { category: "Healthcare", keywords: ["pharmacy", "clinic", "hospital", "health"] },
  { category: "Entertainment", keywords: ["cinema", "movie", "netflix", "spotify", "concert"] },
];

const vendorStopWords = [
  "receipt",
  "invoice",
  "subtotal",
  "total",
  "vat",
  "tax",
  "date",
  "time",
  "cash",
  "card",
  "change",
  "balance",
  "amount",
  "payment",
  "tel",
  "phone",
  "www",
  "http",
];

const lineLooksNoisy = (line) => {
  const lowered = line.toLowerCase();
  if (line.length < 3) return true;
  if (vendorStopWords.some((word) => lowered.includes(word))) return true;
  if (/^[^a-zA-Z]*$/.test(line)) return true;
  return false;
};

const cleanLines = (text) =>
  text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const toTitleCase = (value) =>
  value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const parseAmountToken = (value) => {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

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
    /\b([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const values = match.slice(1).map(Number);
    if (pattern === patterns[0]) {
      const [year, month, day] = values;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    if (pattern === patterns[1]) {
      const [day, month, rawYear] = values;
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    const [, monthName, rawDay, rawYear] = text.match(pattern) ?? [];
    if (monthName && rawDay && rawYear) {
      const monthDate = new Date(`${monthName} 1, ${rawYear}`);
      if (!Number.isNaN(monthDate.getTime())) {
        const year = Number(rawYear) < 100 ? 2000 + Number(rawYear) : Number(rawYear);
        const month = monthDate.getMonth() + 1;
        return `${year}-${String(month).padStart(2, "0")}-${String(Number(rawDay)).padStart(2, "0")}`;
      }
    }
  }
  return new Date().toISOString().split("T")[0];
};

const parseAmounts = (lines) => {
  const amountValues = [];
  let preferredTotal = null;
  let vat = undefined;

  for (const line of lines) {
    const lowered = line.toLowerCase();
    const numbers = [...line.matchAll(/(?:[$£€₹¥]|aed\s*)?-?\d{1,6}(?:[.,]\d{2})/gi)]
      .map((match) => parseAmountToken(match[0]))
      .filter((value) => value !== null);

    if (!numbers.length) continue;
    amountValues.push(...numbers);

    if (/\b(vat|tax|gst|iva)\b/i.test(lowered)) {
      vat = numbers[numbers.length - 1];
    }

    if (/\b(total|amount due|grand total|balance due)\b/i.test(lowered)) {
      preferredTotal = numbers[numbers.length - 1];
    }
  }

  const amount = preferredTotal ?? (amountValues.length ? Math.max(...amountValues) : 0);
  return { amount, vat };
};

const parseVendor = (lines) => {
  const candidates = lines
    .slice(0, 8)
    .filter((line) => !lineLooksNoisy(line))
    .sort((a, b) => b.replace(/[^a-z]/gi, "").length - a.replace(/[^a-z]/gi, "").length);

  const vendor = candidates[0] ?? "Receipt Purchase";
  return toTitleCase(vendor);
};

const parseDescription = (lines, vendor) => {
  const candidate = lines.find((line) => {
    const lowered = line.toLowerCase();
    if (lineLooksNoisy(line)) return false;
    if (toTitleCase(line) === vendor) return false;
    if (/\b(total|vat|tax|invoice|receipt|date|time|auth)\b/i.test(lowered)) return false;
    return true;
  });

  return candidate ? toTitleCase(candidate) : `${vendor} Purchase`;
};

const inferConfidence = ({ vendor, title, vat, rawText, vendorFromFirstLines, titleIsFallback }) => {
  const lowered = rawText.toLowerCase();
  const vendorLooksGeneric = ["store", "shop", "receipt purchase", "payment", "purchase"].includes(
    vendor.toLowerCase(),
  );

  const vendorConfidence = vendorLooksGeneric
    ? "low"
    : vendorFromFirstLines
      ? "high"
      : "medium";

  const titleConfidence = titleIsFallback ? "low" : "medium";

  let vatConfidence = "low";
  if (vat !== undefined && vat !== null) {
    vatConfidence = /\b(vat|tax|gst|iva)\b/i.test(lowered) ? "high" : "medium";
  }

  const explanations = {
    vendor: vendorLooksGeneric
      ? "Vendor looked generic, so this might be wrong."
      : vendorFromFirstLines
        ? "Vendor matched a clear heading line near the top of the receipt."
        : "Vendor was inferred from the most readable text line.",
    title: titleIsFallback
      ? "Description fell back to a generic purchase label."
      : "Description was inferred from non-total/non-tax receipt text.",
    vat:
      vat === undefined || vat === null
        ? "No clear VAT/tax amount was found in OCR text."
        : /\b(vat|tax|gst|iva)\b/i.test(lowered)
          ? "VAT was detected from a line containing VAT/tax keywords."
          : "VAT amount was detected, but VAT/tax keyword context was weak.",
  };

  return {
    vendor: vendorConfidence,
    title: titleConfidence,
    vat: vatConfidence,
    explanations,
  };
};

export const parseReceiptText = (text) => {
  const lines = cleanLines(text);
  const clean = text.replace(/\s+/g, " ").trim();
  const { amount, vat } = parseAmounts(lines);
  const vendor = parseVendor(lines);
  const title = parseDescription(lines, vendor);
  const vendorFromFirstLines = lines.slice(0, 3).some((line) => toTitleCase(line) === vendor);
  const titleIsFallback = title === `${vendor} Purchase`;
  const extraction_confidence = inferConfidence({
    vendor,
    title,
    vat,
    rawText: clean,
    vendorFromFirstLines,
    titleIsFallback,
  });

  return {
    title,
    vendor,
    amount,
    vat,
    date: parseDate(clean),
    category: detectCategory(clean),
    currency: detectCurrency(clean),
    extraction_confidence,
    extraction_notes: extraction_confidence.explanations,
  };
};
