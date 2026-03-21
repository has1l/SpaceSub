import type { TransactionCategory } from '../types';
import { CATEGORY_COLORS } from '../types';

const PATHS: Record<string, string> = {
  SUBSCRIPTIONS: 'M17 1l4 4-4 4M7 23l-4-4 4-4M21 5H9M3 19h12',
  SUPERMARKETS: 'M6 6h1l2 10h8l2.5-7H8.5M11 21a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z',
  TRANSFERS: 'M7 10l-3 3 3 3M17 14l3-3-3-3M4 13h16',
  DIGITAL_SERVICES: 'M4 5h16v11H4zM9 20h6M12 16v4',
  INVESTMENTS: 'M3 20l5-7 4 3 5-6 4-4M17 6h4v4',
  TRANSPORT: 'M5 17h14M7 17V9a2 2 0 012-2h6a2 2 0 012 2v8M9 13h6M7 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  RESTAURANTS: 'M6 3v8a3 3 0 003 3h0a3 3 0 003-3V3M6 8h6M9 14v7M18 3v4c0 1.7-1.3 3-3 3h0v0h3v10',
  HEALTH: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  OTHER: 'M4 6h4v4H4zM10 6h4v4h-4zM16 6h4v4h-4zM4 14h4v4H4zM10 14h4v4h-4zM16 14h4v4h-4z',
};

interface Props {
  category: string;
  size?: number;
}

export default function CategoryIcon({ category, size = 40 }: Props) {
  const color = CATEGORY_COLORS[category as TransactionCategory] || '#6B7280';
  const path = PATHS[category] || PATHS.OTHER;
  const iconSize = Math.round(size * 0.42);

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `${color}14`,
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    </div>
  );
}
