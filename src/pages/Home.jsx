import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { expenseStore } from "@/lib/expense-store";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, ScanLine, ArrowRight, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import ExpenseCard from "../components/ExpenseCard";
import ExpenseDetail from "../components/ExpenseDetail";

export default function Home() {
  const navigate = useNavigate();
  const [selectedExpense, setSelectedExpense] = useState(null);

  const { data: expenses = [], refetch } = useQuery({
    queryKey: ["expenses-recent"],
    queryFn: async () => {
      const all = await expenseStore.list();
      return all.slice(0, 50);
    },
  });

  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const activeExpenses = expenses.filter((e) => !e.archived);
  const monthExpenses = activeExpenses.filter((e) => e.date >= monthStart && e.date <= monthEnd);

  const currencySymbols = { USD:"$", EUR:"€", GBP:"£", INR:"₹", CAD:"CA$", AUD:"A$", JPY:"¥", CNY:"¥", CHF:"Fr", SGD:"S$", AED:"د.إ", MXN:"MX$", BRL:"R$", ZAR:"R" };

  const totalsPerCurrency = monthExpenses.reduce((acc, e) => {
    const cur = e.currency || "GBP";
    acc[cur] = (acc[cur] || 0) + (e.amount || 0);
    return acc;
  }, {});
  const currencyEntries = Object.entries(totalsPerCurrency);
  const recentExpenses = activeExpenses.slice(0, 5);

  const handleDelete = async (id) => {
    await expenseStore.remove(id);
    setSelectedExpense(null);
    refetch();
  };

  const handleArchive = async (id) => {
    await expenseStore.update(id, { archived: true });
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-6 -translate-x-6" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{format(now, "MMMM yyyy")}</span>
          </div>
          {currencyEntries.length === 0 ? (
            <p className="text-4xl font-display font-bold mt-2 tracking-tight">£0.00</p>
          ) : currencyEntries.length === 1 ? (
            <p className="text-4xl font-display font-bold mt-2 tracking-tight">
              {currencySymbols[currencyEntries[0][0]] || currencyEntries[0][0]}{currencyEntries[0][1].toFixed(2)}
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {currencyEntries.map(([cur, total]) => (
                <div key={cur} className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold tracking-tight">
                    {currencySymbols[cur] || cur}{total.toFixed(2)}
                  </span>
                  <span className="text-sm text-primary-foreground/60 font-medium">{cur}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-primary-foreground/70 mt-1">
            {monthExpenses.length} expense{monthExpenses.length !== 1 ? "s" : ""} this month
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/add?mode=scan"
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Scan Receipt</p>
            <p className="text-xs text-muted-foreground">Auto-fill details</p>
          </div>
        </Link>
        <Link
          to="/add"
          className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Add Manual</p>
            <p className="text-xs text-muted-foreground">Enter details</p>
          </div>
        </Link>
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-base">Recent Expenses</h2>
          <Link to="/expenses" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">No expenses yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start by scanning a receipt or adding one manually</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentExpenses.map((exp) => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                onClick={() => setSelectedExpense(exp)}
                onEdit={(id) => navigate(`/edit-expense?id=${id}`)}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <ExpenseDetail
        expense={selectedExpense}
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}