import { format } from "date-fns";
import { Trash2, MapPin, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const currencySymbols = { USD:"$", EUR:"€", GBP:"£", INR:"₹", CAD:"CA$", AUD:"A$", JPY:"¥", CNY:"¥", CHF:"Fr", SGD:"S$", AED:"د.إ", MXN:"MX$", BRL:"R$", ZAR:"R" };

export default function ExpenseDetail({ expense, open, onClose, onDelete, onEdit, onArchive }) {
  if (!expense) return null;
  const sym = currencySymbols[expense.currency] || "$";
  const dateStr = expense.date ? format(new Date(expense.date + "T00:00:00"), "MMMM d, yyyy") : "—";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl overflow-hidden">
        {expense.receipt_url && (
          <div className="bg-muted max-h-56 overflow-hidden">
            <img src={expense.receipt_url} alt="Receipt" className="w-full object-contain max-h-56" />
          </div>
        )}
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display font-bold text-lg">{expense.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
            </div>
            <p className="text-xl font-bold text-primary">{sym}{expense.amount?.toFixed(2)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {expense.category && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                {expense.category}
              </span>
            )}
            {expense.vendor && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {expense.vendor}
              </span>
            )}
          </div>

          {expense.vat > 0 && (
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">VAT</span>
              <span className="text-sm font-semibold text-amber-600">{currencySymbols[expense.currency] || "$"}{expense.vat?.toFixed(2)}</span>
            </div>
          )}

          {expense.notes && (
            <p className="text-sm text-muted-foreground">{expense.notes}</p>
          )}

          <div className="flex gap-2 flex-wrap">
            {onEdit && (
              <Button variant="outline" className="flex-1" onClick={() => onEdit(expense.id)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
            )}
            {onArchive && (
              <Button variant="outline" className="flex-1" onClick={() => onArchive(expense.id, !expense.archived)}>
                {expense.archived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                {expense.archived ? "Unarchive" : "Archive"}
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
              onClick={() => onDelete(expense.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}