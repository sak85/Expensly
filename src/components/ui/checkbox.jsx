export function Checkbox({ checked = false, onCheckedChange, ...props }) {
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      className="h-4 w-4 rounded border-border accent-primary"
      {...props}
    />
  );
}
