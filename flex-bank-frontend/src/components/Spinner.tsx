import { motion } from 'framer-motion';

export default function Spinner({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-14 h-14">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid var(--color-border-subtle)', borderTopColor: 'var(--color-accent-blue)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2.5 rounded-full"
          style={{ border: '1.5px solid var(--color-border-subtle)', borderTopColor: 'var(--color-accent-gold)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-2 h-2 rounded-full bg-accent-gold shadow-[0_0_8px_rgba(212,168,83,0.4)]" />
        </motion.div>
      </div>
      <motion.p
        className="text-text-tertiary text-sm mt-4 font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {text}
      </motion.p>
    </div>
  );
}
