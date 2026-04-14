import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function ReportDownloader({ expenses }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [generating, setGenerating] = useState(false);

  const filtered = expenses.filter((exp) => {
    if (!fromDate && !toDate) return true;
    const d = exp.date;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  const total = filtered.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const generatePDF = async () => {
    if (filtered.length === 0) {
      toast.error("No expenses in the selected date range.");
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Expense Report", pageWidth / 2, y, { align: "center" });
      y += 10;

      // Date range
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const rangeText = fromDate && toDate
        ? `${format(new Date(fromDate + "T00:00:00"), "MMM d, yyyy")} — ${format(new Date(toDate + "T00:00:00"), "MMM d, yyyy")}`
        : fromDate ? `From ${format(new Date(fromDate + "T00:00:00"), "MMM d, yyyy")}`
        : toDate ? `Until ${format(new Date(toDate + "T00:00:00"), "MMM d, yyyy")}`
        : "All dates";
      doc.text(rangeText, pageWidth / 2, y, { align: "center" });
      y += 6;
      doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, pageWidth / 2, y, { align: "center" });
      y += 12;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, pageWidth - 28, 8, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Date", 16, y);
      doc.text("Description", 46, y);
      doc.text("Category", 110, y);
      doc.text("Amount", pageWidth - 16, y, { align: "right" });
      y += 8;

      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const exp of filtered) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const dateStr = exp.date ? format(new Date(exp.date + "T00:00:00"), "MM/dd/yyyy") : "—";
        doc.text(dateStr, 16, y);
        doc.text((exp.title || "").substring(0, 35), 46, y);
        doc.text((exp.category || "—").substring(0, 20), 110, y);
        const sym = { USD:"$", EUR:"€", GBP:"£", INR:"₹", CAD:"CA$", AUD:"A$", JPY:"¥", CNY:"¥", CHF:"Fr", SGD:"S$", AED:"AED ", MXN:"MX$", BRL:"R$", ZAR:"R" }[exp.currency] || "$";
      doc.text(`${sym}${(exp.amount || 0).toFixed(2)}`, pageWidth - 16, y, { align: "right" });
        y += 6;
      }

      // Total
      y += 4;
      doc.setDrawColor(180, 180, 180);
      doc.line(14, y - 3, pageWidth - 14, y - 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Total: $${total.toFixed(2)} (mixed currencies)`, pageWidth - 16, y + 2, { align: "right" });
      doc.text(`${filtered.length} expense(s)`, 16, y + 2);
      y += 14;

      // Receipt images
      const expensesWithReceipts = filtered.filter((e) => e.receipt_url);
      if (expensesWithReceipts.length > 0) {
        doc.addPage();
        y = 20;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Receipt Attachments", pageWidth / 2, y, { align: "center" });
        y += 12;

        for (const exp of expensesWithReceipts) {
          if (y > 220) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          const dateStr = exp.date ? format(new Date(exp.date + "T00:00:00"), "MMM d, yyyy") : "";
          const eSym = { USD:"$", EUR:"€", GBP:"£", INR:"₹", CAD:"CA$", AUD:"A$", JPY:"¥", CNY:"¥", CHF:"Fr", SGD:"S$", AED:"AED ", MXN:"MX$", BRL:"R$", ZAR:"R" }[exp.currency] || "$";
          doc.text(`${exp.title} — ${eSym}${(exp.amount || 0).toFixed(2)} (${dateStr})`, 16, y);
          y += 4;

          try {
            const img = await loadImage(exp.receipt_url);
            const maxW = pageWidth - 32;
            const maxH = 80;
            const ratio = Math.min(maxW / img.width, maxH / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            doc.addImage(img, "JPEG", 16, y, w, h);
            y += h + 10;
          } catch {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.text("[Receipt image could not be loaded]", 16, y + 4);
            y += 12;
          }
        }
      }

      const fileName = `expense_report_${fromDate || "all"}_to_${toDate || "all"}.pdf`;
      doc.save(fileName);
      toast.success("Report downloaded!");
    } catch (err) {
      toast.error("Failed to generate report.");
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">From Date</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To Date</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10" />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border">
        <div>
          <p className="text-sm font-medium">{filtered.length} expense{filtered.length !== 1 ? "s" : ""}</p>
          <p className="text-xs text-muted-foreground">Total: ${total.toFixed(2)}</p>
        </div>
        <Button onClick={generatePDF} disabled={generating || filtered.length === 0} size="sm" className="rounded-lg gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {generating ? "Generating..." : "Download PDF"}
        </Button>
      </div>
    </div>
  );
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = reject;
    img.src = url;
  });
}