import { motion } from 'framer-motion';

interface SpinnerProps {
  className?: string;
  text?: string;
}

export function Spinner({ className = '', text }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative" style={{ width: 56, height: 56 }}>
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid rgba(0,212,170,0.1)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: '50%',
              marginLeft: -3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--signal-primary)',
              boxShadow: '0 0 12px rgba(0,212,170,0.6)',
            }}
          />
        </motion.div>
        {/* Inner ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: 10,
            border: '1.5px solid rgba(14,165,233,0.15)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        >
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: '50%',
              marginLeft: -2,
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'var(--signal-secondary)',
              boxShadow: '0 0 8px rgba(14,165,233,0.5)',
            }}
          />
        </motion.div>
        {/* Center dot */}
        <motion.div
          className="absolute rounded-full"
          style={{
            top: '50%',
            left: '50%',
            marginTop: -3,
            marginLeft: -3,
            width: 6,
            height: 6,
            background: 'var(--signal-primary)',
            boxShadow: '0 0 16px rgba(0,212,170,0.4)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      {text && (
        <p
          className="text-xs tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-mono)', color: 'rgba(200,214,229,0.4)' }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
