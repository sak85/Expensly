import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { expenseStore } from "@/lib/expense-store";
import { toast } from "sonner";
import { ScanLine, PenLine } from "lucide-react";
import ReceiptScanner from "../components/ReceiptScanner";
import ExpenseForm from "../components/ExpenseForm";

export default function AddExpense() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get("mode") === "scan" ? "scan" : "manual";

  const [scannedData, setScannedData] = useState(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScanComplete = (data) => {
    setScannedData(data);
    setActiveTab("manual");
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await expenseStore.create(formData);
      toast.success("Expense saved!");
      navigate("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-xl tracking-tight">Add Expense</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Scan a receipt or enter details manually</p>
      </div>

      <div>
        <div className="w-full grid grid-cols-2 h-11 rounded-xl border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={`rounded-lg gap-2 text-sm flex items-center justify-center ${activeTab === "scan" ? "bg-background shadow-sm" : ""}`}
          >
            <ScanLine className="w-4 h-4" /> Scan Receipt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`rounded-lg gap-2 text-sm flex items-center justify-center ${activeTab === "manual" ? "bg-background shadow-sm" : ""}`}
          >
            <PenLine className="w-4 h-4" /> Manual Entry
          </button>
        </div>

        {activeTab === "scan" && (
          <div className="mt-4">
          <ReceiptScanner onScanComplete={handleScanComplete} />
          </div>
        )}

        {activeTab === "manual" && (
          <div className="mt-4">
          <ExpenseForm
            initialData={scannedData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
          </div>
        )}
      </div>
    </div>
  );
}