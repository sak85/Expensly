import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

export default function AuthScreen() {
  const { login, signup } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">ExpenseSnap</span>
        </div>
        <h1 className="text-xl font-semibold">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep your receipts private and synced to your account.
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={login} className="flex-1">Login</Button>
          <Button onClick={signup} variant="outline" className="flex-1">Sign up</Button>
        </div>
      </div>
    </div>
  );
}
