interface KiroIconProps {
  size?: number;
  className?: string;
}

export default function KiroIcon({ size = 40, className = "" }: KiroIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="kiro-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop
            offset="100%"
            stopColor="hsl(var(--primary))"
            stopOpacity="0.7"
          />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#kiro-gradient)" />
      <text
        x="50"
        y="50"
        dominantBaseline="central"
        textAnchor="middle"
        fill="hsl(var(--primary-foreground))"
        fontSize="60"
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        K
      </text>
    </svg>
  );
}
