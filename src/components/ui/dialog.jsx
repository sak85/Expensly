export function Dialog({ open, children }) {
  if (!open) return null;
  return <>{children}</>;
}

export function DialogContent({ className = "", children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-lg bg-card shadow-lg ${className}`}>{children}</div>
    </div>
  );
}

export function DialogHeader({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

export function DialogTitle({ className = "", children }) {
  return <h2 className={className}>{children}</h2>;
}
