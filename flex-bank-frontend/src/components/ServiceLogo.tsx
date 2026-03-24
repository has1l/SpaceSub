import { useState } from 'react';
import type { TransactionCategory } from '../types';
import { CATEGORY_COLORS } from '../types';
import CategoryIcon from './CategoryIcon';

interface Props {
  logoUrl: string | null;
  category: string;
  size?: number;
}

export default function ServiceLogo({ logoUrl, category, size = 48 }: Props) {
  const [failed, setFailed] = useState(false);
  const color = CATEGORY_COLORS[category as TransactionCategory] || '#6B7280';

  if (!logoUrl || failed) {
    return <CategoryIcon category={category} size={size} />;
  }

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        background: `${color}0A`,
        border: `1px solid ${color}20`,
      }}
    >
      <img
        src={logoUrl}
        alt=""
        width={size - 8}
        height={size - 8}
        className="rounded-lg object-contain"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}
