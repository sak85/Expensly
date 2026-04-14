import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { expenseStore } from "@/lib/expense-store";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ExpenseForm from "../components/ExpenseForm";

export default function EditExpense() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const expenseId = urlParams.get("id");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => expenseStore.getById(expenseId),
    enabled: !!expenseId,
  });

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    await expenseStore.update(expenseId, data);
    toast.success("Expense updated!");
    navigate("/expenses");
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight">Edit Expense</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Update the details below</p>
        </div>
      </div>
      {expense && (
        <ExpenseForm initialData={expense} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}