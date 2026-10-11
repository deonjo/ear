// Small inline icons (no icon font or external requests).
type P = { className?: string; title?: string };

const base = (title?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": title ? undefined : true,
  role: title ? "img" : undefined,
});

export const PlayIcon = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>
    {title && <title>{title}</title>}
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />
  </svg>
);
export const ReplayIcon = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>
    {title && <title>{title}</title>}
    <path d="M4 10h3l4-4v12l-4-4H4z" fill="currentColor" />
    <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" />
  </svg>
);
export const CloseIcon = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>
    {title && <title>{title}</title>}
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const HomeIcon = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>
    {title && <title>{title}</title>}
    <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
  </svg>
);
export const AgainIcon = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>
    {title && <title>{title}</title>}
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
  </svg>
);
export const StarIcon = ({ className, title }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
    {title && <title>{title}</title>}
    <path
      d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"
      fill="currentColor"
      stroke="rgba(0,0,0,0.18)"
      strokeWidth={1}
      strokeLinejoin="round"
    />
  </svg>
);
export const LockIcon = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>
    {title && <title>{title}</title>}
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const CheckIcon = ({ className, title }: P) => (
  <svg {...base(title)} className={className}>
    {title && <title>{title}</title>}
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const DotIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="5" fill="currentColor" />
  </svg>
);
