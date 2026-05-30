export function SectionHeader({
  title,
  eyebrow,
  detail,
}: {
  title: string;
  eyebrow: string;
  detail: string;
}) {
  return (
    <div className="section-head">
      <div className="section-eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}
