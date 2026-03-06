import { motion } from 'framer-motion';

interface OrbitDecorationProps {
  className?: string;
}

export function OrbitDecoration({ className = '' }: OrbitDecorationProps) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      {/* Outer orbit */}
      <motion.div
        className="orbit-ring"
        style={{ width: 280, height: 280, top: -100, right: -100 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {/* Satellite dot on orbit */}
        <motion.div
          style={{
            position: 'absolute',
            top: -3,
            left: '50%',
            marginLeft: -3,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--signal-primary)',
            boxShadow: '0 0 10px rgba(0,212,170,0.5)',
          }}
        />
      </motion.div>
      {/* Inner orbit */}
      <div
        className="orbit-ring"
        style={{ width: 180, height: 180, top: -50, right: -50, opacity: 0.5 }}
      />
    </div>
  );
}
