import { useId } from "react";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 40, className }: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const blue = `star-blue-${uid}`;
  const steel = `star-steel-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={blue} x1="16" y1="6" x2="50" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="52%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id={steel} x1="50" y1="8" x2="14" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="48%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#f8fafc" />
      <g fill="none" strokeLinecap="round">
        <ellipse
          cx="32"
          cy="32"
          rx="23.4"
          ry="9.1"
          transform="rotate(-28 32 32)"
          stroke="#2563eb"
          strokeWidth="3.15"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="23.4"
          ry="9.1"
          transform="rotate(38 32 32)"
          stroke="#94a3b8"
          strokeWidth="3.15"
        />
      </g>
      <path fill={`url(#${blue})`} d="M32 6 L37.4 27.6 32 32 26.6 27.6 Z" />
      <path fill={`url(#${steel})`} d="M58 32 L36.4 37.4 32 32 36.4 26.6 Z" />
      <path fill={`url(#${blue})`} d="M32 58 L26.6 36.4 32 32 37.4 36.4 Z" />
      <path fill={`url(#${steel})`} d="M6 32 L27.6 26.6 32 32 27.6 37.4 Z" />
      <path fill="#f8fafc" d="M32 24.8 L33.6 30.4 39.2 32 33.6 33.6 32 39.2 30.4 33.6 24.8 32 30.4 30.4 Z" />
    </svg>
  );
}
