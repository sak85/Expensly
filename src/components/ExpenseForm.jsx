import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { fileToOptimizedImageDataUrl } from "@/lib/file-utils";

const categories = ["Food & Dining", "Transport", "Office Supplies", "Travel", "Utilities", "Entertainment", "Healthcare", "Other"];

const currencies = [
  { code: "USD", symbol: "$", label: "USD — US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR — Euro" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound" },
  { code: "INR", symbol: "₹", label: "INR — Indian Rupee" },
  { code: "CAD", symbol: "CA$", label: "CAD — Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD — Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY — Japanese Yen" },
  { code: "CNY", symbol: "¥", label: "CNY — Chinese Yuan" },
  { code: "CHF", symbol: "Fr", label: "CHF — Swiss Franc" },
  { code: "SGD", symbol: "S$", label: "SGD — Singapore Dollar" },
  { code: "AED", symbol: "د.إ", label: "AED — UAE Dirham" },
  { code: "MXN", symbol: "MX$", label: "MXN — Mexican Peso" },
  { code: "BRL", symbol: "R$", label: "BRL — Brazilian Real" },
  { code: "ZAR", symbol: "R", label: "ZAR — South African Rand" },
];

export default function ExpenseForm({ initialData, onSubmit, isSubmitting }) {
  const scanConfidence = initialData?.extraction_confidence;
  const scanNotes = initialData?.extraction_notes || {};
  const lowConfidenceFields = {
    title: scanConfidence?.title === "low",
    vendor: scanConfidence?.vendor === "low",
    vat: scanConfidence?.vat === "low",
  };
  const hasLowConfidence = Object.values(lowConfidenceFields).some(Boolean);

  const [form, setForm] = useState({
    title: initialData?.title || "",
    amount: initialData?.amount || "",
    vat: initialData?.vat || "",
    date: initialData?.date || new Date().toISOString().split("T")[0],
    category: initialData?.category || "",
    vendor: initialData?.vendor || "",
    notes: initialData?.notes || "",
    receipt_url: initialData?.receipt_url || "",
    currency: initialData?.currency || "GBP",
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const currencySymbol = currencies.find((c) => c.code === form.currency)?.symbol || "$";

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const useVendorAsDescription = () => {
    if (!form.vendor) return;
    handleChange("title", form.vendor);
  };

  const clearVatGuess = () => {
    handleChange("vat", "");
  };

  const uploadReceipt = async (file) => {
    setUploading(true);
    try {
      const dataUrl = await fileToOptimizedImageDataUrl(file);
      handleChange("receipt_url", dataUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadReceipt(file);
    e.target.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, amount: parseFloat(form.amount), vat: form.vat !== "" ? parseFloat(form.vat) : undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {scanConfidence && (
        <div className={`rounded-xl border p-3 ${hasLowConfidence ? "border-amber-300 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"}`}>
          <p className="text-sm font-semibold">Review extracted fields</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            OCR guessed these values. Confirm before saving.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <ConfidenceChip label="Description" level={scanConfidence.title} />
            <ConfidenceChip label="Vendor" level={scanConfidence.vendor} />
            <ConfidenceChip label="VAT" level={scanConfidence.vat} />
          </div>
          {hasLowConfidence && (
            <p className="mt-2 text-xs text-amber-700">
              Low confidence fields are highlighted below for quick correction.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium leading-none">Description *</label>
        <Input
          id="title"
          placeholder="e.g. Office lunch, Uber ride"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
          className={`h-11 ${lowConfidenceFields.title ? "border-amber-400 ring-amber-300 focus-visible:ring-amber-400" : ""}`}
        />
        {scanConfidence?.title && (
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs ${lowConfidenceFields.title ? "text-amber-700" : "text-muted-foreground"}`}>
              {scanNotes.title || "Description confidence is estimated from OCR quality."}
            </p>
            <button
              type="button"
              onClick={useVendorAsDescription}
              className="text-xs text-primary hover:underline whitespace-nowrap"
            >
              Use vendor as description
            </button>
          </div>
        )}
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Currency</label>
        <select
          value={form.currency}
          onChange={(e) => handleChange("currency", e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium leading-none">Amount *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{currencySymbol}</span>
            <Input id="amount" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} required className="h-11 pl-8" />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-medium leading-none">Date *</label>
          <Input id="date" type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required className="h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="vat" className="text-sm font-medium leading-none">VAT / Tax Amount <span className="text-muted-foreground font-normal">(optional)</span></label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{currencySymbol}</span>
          <Input
            id="vat"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.vat}
            onChange={(e) => handleChange("vat", e.target.value)}
            className={`h-11 pl-8 ${lowConfidenceFields.vat ? "border-amber-400 ring-amber-300 focus-visible:ring-amber-400" : ""}`}
          />
        </div>
        {scanConfidence?.vat && (
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs ${lowConfidenceFields.vat ? "text-amber-700" : "text-muted-foreground"}`}>
              {scanNotes.vat || "VAT confidence is estimated from OCR tax matching."}
            </p>
            <button
              type="button"
              onClick={clearVatGuess}
              className="text-xs text-primary hover:underline whitespace-nowrap"
            >
              Clear VAT guess
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Category</label>
          <select
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="vendor" className="text-sm font-medium leading-none">Vendor</label>
          <Input
            id="vendor"
            placeholder="Store name"
            value={form.vendor}
            onChange={(e) => handleChange("vendor", e.target.value)}
            className={`h-11 ${lowConfidenceFields.vendor ? "border-amber-400 ring-amber-300 focus-visible:ring-amber-400" : ""}`}
          />
          {scanConfidence?.vendor && (
            <p className={`text-xs ${lowConfidenceFields.vendor ? "text-amber-700" : "text-muted-foreground"}`}>
              {scanNotes.vendor || "Vendor confidence is estimated from heading line detection."}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium leading-none">Notes</label>
        <textarea
          id="notes"
          placeholder="Any additional details..."
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Receipt */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Receipt</label>
        {form.receipt_url ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
            <img src={form.receipt_url} alt="Receipt" className="w-full max-h-48 object-contain" />
            <button
              type="button"
              onClick={() => handleChange("receipt_url", "")}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/90 backdrop-blur flex items-center justify-center border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : uploading ? (
          <div className="flex items-center justify-center py-8 rounded-xl border-2 border-dashed border-border">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Uploading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 transition-all text-sm text-muted-foreground hover:text-foreground"
            >
              <Camera className="w-4 h-4" /> Take Photo
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 transition-all text-sm text-muted-foreground hover:text-foreground"
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl" disabled={isSubmitting || uploading}>
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {isSubmitting ? "Saving..." : "Save Expense"}
      </Button>
    </form>
  );
}

function ConfidenceChip({ label, level }) {
  const styles = {
    high: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-sky-100 text-sky-700 border-sky-200",
    low: "bg-amber-100 text-amber-700 border-amber-200",
  };
  const normalizedLevel = level || "low";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 font-medium ${styles[normalizedLevel] || styles.low}`}>
      {label}: {normalizedLevel}
    </span>
  );
}