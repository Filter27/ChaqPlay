export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="ChaqPlay">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && <span className="brand-name">ChaqPlay</span>}
    </div>
  );
}
