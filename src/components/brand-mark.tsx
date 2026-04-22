export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 22 22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="3" width="3" height="16" rx="1.25" fill="currentColor" />
      <rect x="16" y="3" width="3" height="16" rx="1.25" fill="currentColor" />
      <path
        d="M6 11H11V7"
        stroke="var(--signal-strong)"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <circle cx="11" cy="11" fill="var(--signal-strong)" r="1.65" />
    </svg>
  )
}
