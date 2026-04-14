import { format } from "date-fns";
import { Receipt, Pencil, Trash2, Archive } from "lucide-react";

const categoryColors = {
  "Food & Dining": "bg-orange-100 text-orange-700",
  "Transport": "bg-blue-100 text-blue-700",
  "Office Supplies": "bg-violet-100 text-violet-700",
  "Travel": "bg-emerald-100 text-emerald-700",
  "Utilities": "bg-yellow-100 text-yellow-700",
  "Entertainment": "bg-pink-100 text-pink-700",
  "Healthcare": "bg-red-100 text-red-700",
  "Other": "bg-gray-100 text-gray-700",
};

const currencySymbols = { USD:"$", EUR:"€", GBP:"£", INR:"₹", CAD:"CA$", AUD:"A$", JPY:"¥", CNY:"¥", CHF:"Fr", SGD:"S$", AED:"د.إ", MXN:"MX$", BRL:"R$", ZAR:"R" };

export default function ExpenseCard({ expense, onClick, onEdit, onDelete, onArchive }) {
  const sym = currencySymbols[expense.currency] || "$";
  const dateStr = expense.date ? format(new Date(expense.date + "T00:00:00"), "MMM d, yyyy") : "—";

  return (
    <div className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all group">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        {expense.receipt_url ? (
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img src={expense.receipt_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{expense.title}</p>
            <p className="font-semibold text-sm whitespace-nowrap">{sym}{expense.amount?.toFixed(2)}</p>
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
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(expense.id); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onArchive && (
          <button onClick={(e) => { e.stopPropagation(); onArchive(expense.id, true); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-amber-600" title="Archive">
            <Archive className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}