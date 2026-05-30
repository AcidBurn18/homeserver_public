export function StatusCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <section className={`status-card tone-${tone}`}>
      <div className="status-label">{label}</div>
      <div className="status-value">{value}</div>
      <div className="status-hint">{hint}</div>
    </section>
  );
}
