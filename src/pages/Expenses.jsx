import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { expenseStore } from "@/lib/expense-store";
import { useQuery } from "@tanstack/react-query";
import { Search, Trash2, FileDown, FileText, Archive, X, CalendarIcon, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ExpenseDetail from "../components/ExpenseDetail";
import { format } from "date-fns";
import { toast } from "sonner";
import JSZip from "jszip";
import jsPDF from "jspdf";

const currencySymbols = { USD:"$", EUR:"€", GBP:"£", INR:"₹", CAD:"CA$", AUD:"A$", JPY:"¥", CNY:"¥", CHF:"Fr", SGD:"S$", AED:"AED ", MXN:"MX$", BRL:"R$", ZAR:"R" };

export default function Expenses() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Note: both date filters intentionally start empty to show all expenses
  const [showArchived, setShowArchived] = useState(false); // 'delete' | 'pdf' | 'csv' | 'zip'

  const { data: expenses = [], refetch } = useQuery({
    queryKey: ["expenses-all"],
    queryFn: async () => {
      const all = await expenseStore.list();
      return all.slice(0, 500);
    },
  });

  const filtered = expenses.filter((e) => {
    if (!!e.archived !== showArchived) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.title || "").toLowerCase().includes(q) ||
      (e.vendor || "").toLowerCase().includes(q) ||
      (e.category || "").toLowerCase().includes(q)
    );
  });

  const selectedList = filtered.filter((e) => checked.has(e.id));
  const allChecked = filtered.length > 0 && filtered.every((e) => checked.has(e.id));

  const totalsByCurrency = filtered.reduce((acc, e) => {
    const cur = e.currency || "USD";
    if (!acc[cur]) acc[cur] = { amount: 0, vat: 0 };
    acc[cur].amount += e.amount || 0;
    acc[cur].vat += e.vat || 0;
    return acc;
  }, {});

  const toggleCheck = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) setChecked(new Set());
    else setChecked(new Set(filtered.map((e) => e.id)));
  };

  const clearSelection = () => setChecked(new Set());

  const handleDelete = async (id) => {
    await expenseStore.remove(id);
    setSelectedExpense(null);
    setChecked((prev) => { const next = new Set(prev); next.delete(id); return next; });
    refetch();
  };

  const handleArchive = async (id, archive) => {
    await expenseStore.update(id, { archived: archive });
    setSelectedExpense(null);
    refetch();
    toast.success(archive ? "Expense archived" : "Expense unarchived");
  };

  const handleBulkArchive = async () => {
    if (!selectedList.length) return;
    setBulkLoading("archive");
    for (const e of selectedList) await expenseStore.update(e.id, { archived: true });
    toast.success(`Archived ${selectedList.length} expense(s)`);
    clearSelection();
    refetch();
    setBulkLoading(null);
  };

  const handleBulkDelete = async () => {
    if (!selectedList.length) return;
    setBulkLoading("delete");
    for (const e of selectedList) await expenseStore.remove(e.id);
    toast.success(`Deleted ${selectedList.length} expense(s)`);
    clearSelection();
    refetch();
    setBulkLoading(null);
  };

  const downloadCSV = () => {
    setBulkLoading("csv");
    const headers = ["Date", "Title", "Vendor", "Category", "Amount", "VAT", "Currency", "Notes"];
    const rows = selectedList.map((e) => [
      e.date || "",
      `"${(e.title || "").replace(/"/g, '""')}"`,
      `"${(e.vendor || "").replace(/"/g, '""')}"`,
      e.category || "",
      (e.amount || 0).toFixed(2),
      e.vat > 0 ? e.vat.toFixed(2) : "",
      e.currency || "USD",
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
    setBulkLoading(null);
  };

  const downloadZip = async () => {
    const withReceipts = selectedList.filter((e) => e.receipt_url);
    if (!withReceipts.length) { toast.error("No receipts in selection"); return; }
    setBulkLoading("zip");
    const zip = new JSZip();
    for (const e of withReceipts) {
      try {
        const res = await fetch(e.receipt_url);
        const blob = await res.blob();
        const ext = blob.type.includes("png") ? "png" : "jpg";
        const name = `${e.date || "receipt"}_${(e.title || "expense").replace(/[^a-z0-9]/gi, "_")}.${ext}`;
        zip.file(name, blob);
      } catch { /* skip */ }
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipts_${format(new Date(), "yyyy-MM-dd")}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP downloaded!");
    setBulkLoading(null);
  };

  const downloadPDF = async () => {
    if (!selectedList.length) return;
    setBulkLoading("pdf");
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 20;

      doc.setFontSize(20); doc.setFont("helvetica", "bold");
      doc.text("Expense Report", pageWidth / 2, y, { align: "center" }); y += 8;
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, pageWidth / 2, y, { align: "center" }); y += 10;

      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, pageWidth - 28, 8, "F");
      doc.setFontSize(8); doc.setFont("helvetica", "bold");
      doc.text("Date", 16, y); doc.text("Description", 46, y);
      doc.text("Category", 105, y); doc.text("VAT", 153, y, { align: "right" }); doc.text("Amount", pageWidth - 16, y, { align: "right" }); y += 8;

      doc.setFont("helvetica", "normal");
      for (const exp of selectedList) {
        if (y > 270) { doc.addPage(); y = 20; }
        const dateStr = exp.date ? format(new Date(exp.date + "T00:00:00"), "MM/dd/yyyy") : "—";
        const sym = currencySymbols[exp.currency] || "£";
        doc.text(dateStr, 16, y);
        doc.text((exp.title || "").substring(0, 30), 46, y);
        doc.text((exp.category || "—").substring(0, 18), 105, y);
        if (exp.vat > 0) doc.text(`${sym}${exp.vat.toFixed(2)}`, 153, y, { align: "right" });
        doc.text(`${sym}${(exp.amount || 0).toFixed(2)}`, pageWidth - 16, y, { align: "right" }); y += 6;
      }

      // Receipts — one per page, full size
      const withReceipts = selectedList.filter((e) => e.receipt_url);
      for (const exp of withReceipts) {
        doc.addPage(); y = 20;
        const sym = currencySymbols[exp.currency] || "$";
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text(`${exp.title} — ${sym}${(exp.amount || 0).toFixed(2)}`, 16, y); y += 6;
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        if (exp.date) doc.text(format(new Date(exp.date + "T00:00:00"), "MMMM d, yyyy"), 16, y); y += 8;
        try {
          const { dataUrl, format } = await loadImage(exp.receipt_url);
          const imgProps = doc.getImageProperties(dataUrl);
          const maxW = pageWidth - 32;
          const maxH = pageHeight - y - 20;
          const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
          doc.addImage(dataUrl, format, 16, y, imgProps.width * ratio, imgProps.height * ratio);
        } catch {
          doc.text("[Receipt image could not be loaded]", 16, y);
        }
      }

      doc.save(`expenses_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF downloaded!");
    } catch (err) {
      toast.error("Failed to generate PDF");
      throw err;
    } finally {
      setBulkLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight">All Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{expenses.length} total</p>
        </div>
      </div>

      {/* Search + date range */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="pl-9 h-9 text-xs rounded-xl" placeholder="From" autoComplete="off" />
          </div>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="pl-9 h-9 text-xs rounded-xl" placeholder="To" autoComplete="off" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              showArchived ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Archive className="w-3 h-3 inline mr-1" />
            {showArchived ? "Showing archived" : "Show archived"}
          </button>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {checked.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-primary mr-1">{checked.size} selected</span>
          <Button size="sm" variant="outline" onClick={downloadCSV} disabled={!!bulkLoading} className="rounded-lg gap-1.5 text-xs h-8">
            <FileText className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={downloadZip} disabled={!!bulkLoading} className="rounded-lg gap-1.5 text-xs h-8">
            ZIP
          </Button>
          {!showArchived && (
            <Button size="sm" variant="outline" onClick={handleBulkArchive} disabled={!!bulkLoading} className="rounded-lg gap-1.5 text-xs h-8">
              <Archive className="w-3.5 h-3.5" /> Archive
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={downloadPDF} disabled={!!bulkLoading} className="rounded-lg gap-1.5 text-xs h-8">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={!!bulkLoading} className="rounded-lg gap-1.5 text-xs h-8 ml-auto">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="rounded-lg h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
          <Checkbox checked={allChecked} onCheckedChange={toggleAll} id="select-all" />
          <label htmlFor="select-all" className="cursor-pointer select-none">Select all</label>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">{search ? "No expenses match your search" : "No expenses recorded yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => (
            <div key={exp.id} className="flex items-center gap-2">
              <Checkbox checked={checked.has(exp.id)} onCheckedChange={() => toggleCheck(exp.id)} />
              <div className="flex-1 min-w-0">
                <ExpenseRow expense={exp} onClick={() => setSelectedExpense(exp)} onEdit={() => navigate(`/edit-expense?id=${exp.id}`)} onDelete={handleDelete} onArchive={handleArchive} />
              </div>
            </div>
          ))}

          {/* Totals footer */}
          <div className="mt-3 rounded-xl bg-muted/60 border border-border p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Totals ({filtered.length} expense{filtered.length !== 1 ? "s" : ""})</p>
            {Object.entries(totalsByCurrency).map(([cur, { amount, vat }]) => {
              const sym = currencySymbols[cur] || cur;
              return (
                <div key={cur} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{cur}</span>
                  <div className="flex gap-6">
                    {vat > 0 && (
                      <span className="text-muted-foreground">VAT: <span className="font-semibold text-foreground">{sym}{vat.toFixed(2)}</span></span>
                    )}
                    <span>Total: <span className="font-bold text-primary">{sym}{amount.toFixed(2)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ExpenseDetail
        expense={selectedExpense}
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onDelete={handleDelete}
        onEdit={(id) => { setSelectedExpense(null); navigate(`/edit-expense?id=${id}`); }}
        onArchive={handleArchive}
      />
    </div>
  );
}

function ExpenseRow({ expense, onClick, onEdit, onDelete, onArchive }) {
  const sym = currencySymbols[expense.currency] || "$";
  const dateStr = expense.date ? format(new Date(expense.date + "T00:00:00"), "MMM d, yyyy") : "—";
  const categoryColors = {
    "Food & Dining": "bg-orange-100 text-orange-700", "Transport": "bg-blue-100 text-blue-700",
    "Office Supplies": "bg-violet-100 text-violet-700", "Travel": "bg-emerald-100 text-emerald-700",
    "Utilities": "bg-yellow-100 text-yellow-700", "Entertainment": "bg-pink-100 text-pink-700",
    "Healthcare": "bg-red-100 text-red-700", "Other": "bg-gray-100 text-gray-700",
  };

  return (
    <div className="flex items-center gap-2 p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all group">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        {expense.receipt_url ? (
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img src={expense.receipt_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-xs font-bold">
            {(expense.title || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm truncate">{expense.title}</p>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-sm">{sym}{expense.amount?.toFixed(2)}</p>
              {expense.vat > 0 && (
                <p className="text-[10px] text-amber-600 font-medium">VAT {sym}{expense.vat.toFixed(2)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{dateStr}</span>
            {expense.category && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${categoryColors[expense.category] || categoryColors.Other}`}>
                {expense.category}
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onArchive(expense.id, !expense.archived); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-amber-600" title={expense.archived ? "Unarchive" : "Archive"}>
          <Archive className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isDataUrl = url.startsWith("data:");
    if (!isDataUrl) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const format = isDataUrl && url.startsWith("data:image/png") ? "PNG" : "JPEG";
      resolve({ dataUrl, format });
    };
    img.onerror = reject;
    img.src = isDataUrl ? url : url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();
  });
}