export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <svg
        viewBox="0 0 80 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M14 60V32C14 20 23 14 34 14H42V40C42 52 51 60 64 60M30 66V42C30 30 39 24 50 24H66" />
      </svg>
      {!compact && (
        <span>
          MOVRA<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
