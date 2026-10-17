/** Warning triangle at a 2.5px stroke so it survives a dim screen. Never the only signal. */
export function WarningMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    >
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18v.01" strokeLinecap="round" />
    </svg>
  );
}
