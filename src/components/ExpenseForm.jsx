import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      <div className="space-y-2">
        <Label htmlFor="title">Description *</Label>
        <Input
          id="title"
          placeholder="e.g. Office lunch, Uber ride"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
          className="h-11"
        />
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label>Currency</Label>
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
          <Label htmlFor="amount">Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{currencySymbol}</span>
            <Input id="amount" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} required className="h-11 pl-8" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input id="date" type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required className="h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vat">VAT / Tax Amount <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{currencySymbol}</span>
          <Input id="vat" type="number" step="0.01" placeholder="0.00" value={form.vat} onChange={(e) => handleChange("vat", e.target.value)} className="h-11 pl-8" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Category</Label>
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
          <Label htmlFor="vendor">Vendor</Label>
          <Input
            id="vendor"
            placeholder="Store name"
            value={form.vendor}
            onChange={(e) => handleChange("vendor", e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional details..."
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={2}
        />
      </div>

      {/* Receipt */}
      <div className="space-y-2">
        <Label>Receipt</Label>
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