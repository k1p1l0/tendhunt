export function ContractCount({
  total,
  filtered,
}: {
  total: number;
  filtered: number;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {filtered === total
        ? `${total.toLocaleString()} contracts`
        : `Showing ${filtered.toLocaleString()} of ${total.toLocaleString()} contracts`}
    </p>
  );
}
