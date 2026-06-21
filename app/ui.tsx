import { STATUS_META, type SpoilageStatus } from '../lib/core/spoilage';

export function StatusChip({
  status,
  label,
}: {
  status: SpoilageStatus;
  /** Override the default status label (e.g. show the item name on a recipe card). */
  label?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span className={`chip ${status}`}>
      <span className="glyph" aria-hidden>
        {meta.glyph}
      </span>
      {label ? `${label} · ${meta.label.replace(' — check it', '')}` : meta.label}
    </span>
  );
}

export function Header({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <header className="app-header">
      <div className="kicker">{kicker}</div>
      <h1>{title}</h1>
      {sub ? <div className="sub">{sub}</div> : null}
    </header>
  );
}
