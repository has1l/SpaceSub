import { motion } from 'framer-motion';

interface SatelliteIconProps {
  size?: number;
  color?: string;
  className?: string;
  animate?: boolean;
}

export function SatelliteIcon({
  size = 24,
  color = 'currentColor',
  className = '',
  animate = false,
}: SatelliteIconProps) {
  const Wrapper = animate ? motion.svg : 'svg';
  const animateProps = animate
    ? { animate: { rotate: [0, 5, -5, 0] }, transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const } }
    : {};

  return (
    <Wrapper
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...animateProps}
    >
      {/* Main body */}
      <rect x="8" y="8" width="8" height="8" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
      {/* Solar panels */}
      <line x1="4" y1="12" x2="8" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="1" y="9.5" width="3" height="5" rx="0.5" stroke={color} strokeWidth="1" fill="none" />
      <rect x="20" y="9.5" width="3" height="5" rx="0.5" stroke={color} strokeWidth="1" fill="none" />
      {/* Antenna */}
      <line x1="12" y1="8" x2="12" y2="4" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <circle cx="12" cy="3" r="1" fill={color} opacity="0.6" />
      {/* Signal waves */}
      <path d="M14.5 5.5 Q16 4 17.5 5" stroke={color} strokeWidth="0.8" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M15.5 4 Q17.5 2.5 19.5 4" stroke={color} strokeWidth="0.6" fill="none" opacity="0.25" strokeLinecap="round" />
    </Wrapper>
  );
}
