export default function Mark() {
  return (
    <span className="mark">
      <svg viewBox="0 0 26 22" aria-hidden="true">
        <rect x="1" y="12" width="6" height="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="10" y="7" width="6" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="19" y="1" width="6" height="20" fill="var(--accent)" stroke="currentColor" strokeWidth="2" />
      </svg>
      Candle Three
    </span>
  );
}
