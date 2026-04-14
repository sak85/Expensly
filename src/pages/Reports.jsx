import { useState } from "react";
import { expenseStore } from "@/lib/expense-store";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

const currencySymbols = { USD:"$", EUR:"€", GBP:"£", INR:"₹", CAD:"CA$", AUD:"A$", JPY:"¥", CNY:"¥", CHF:"Fr", SGD:"S$", AED:"AED ", MXN:"MX$", BRL:"R$", ZAR:"R" };

const CATEGORY_COLORS = {
  "Food & Dining": "#f97316",
  "Transport": "#3b82f6",
  "Office Supplies": "#8b5cf6",
  "Travel": "#10b981",
  "Utilities": "#eab308",
  "Entertainment": "#ec4899",
  "Healthcare": "#ef4444",
  "Other": "#6b7280",
};

const MONTHS = [0, 1, 2, 3, 4, 5].map((i) => {
  const d = subMonths(new Date(), i);
  return { label: format(d, "MMM yyyy"), start: format(startOfMonth(d), "yyyy-MM-dd"), end: format(endOfMonth(d), "yyyy-MM-dd") };
});

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(0);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-reports"],
    queryFn: async () => {
      const all = await expenseStore.list();
      return all.slice(0, 500);
    },
  });

  const { start, end } = MONTHS[selectedMonth];
  const monthExpenses = expenses.filter((e) => !e.archived && e.date >= start && e.date <= end);

  const byCategory = monthExpenses.reduce((acc, e) => {
    const cat = e.category || "Other";
    acc[cat] = (acc[cat] || 0) + (e.amount || 0);
    return acc;
  }, {});

  const chartData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  // Use majority currency for symbol
  const currencyCounts = monthExpenses.reduce((acc, e) => {
    const c = e.currency || "GBP";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const mainCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "GBP";
  const sym = currencySymbols[mainCurrency] || "£";

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-md text-sm">
          <p className="font-semibold">{d.name}</p>
          <p className="text-primary font-bold">{sym}{d.value.toFixed(2)}</p>
          <p className="text-muted-foreground text-xs">{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-xl tracking-tight">Spending Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Breakdown by category</p>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {MONTHS.map((m, i) => (
          <button
            key={i}
            onClick={() => setSelectedMonth(i)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              selectedMonth === i
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted-foreground">No expenses for {MONTHS[selectedMonth].label}</p>
        </div>
      ) : (
        <>
          {/* Total */}
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
            <p className="text-sm text-primary-foreground/70">Total spending</p>
            <p className="text-3xl font-display font-bold mt-1">{sym}{total.toFixed(2)}</p>
            <p className="text-xs text-primary-foreground/60 mt-1">{monthExpenses.length} expense{monthExpenses.length !== 1 ? "s" : ""} · {MONTHS[selectedMonth].label}</p>
          </div>

          {/* Pie Chart */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="font-semibold text-sm mb-4">Category Distribution</h2>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 w-full">
                {chartData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[d.name] || "#6b7280" }} />
                    <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                    <span className="text-xs font-semibold ml-auto">{sym}{d.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="font-semibold text-sm mb-4">Spending by Category</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickFormatter={(v) => v.split(" ")[0]} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${sym}${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}