import { motion } from 'framer-motion';

export default function Spinner({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      {/* Orbital spinner */}
      <div className="relative w-16 h-16">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid rgba(79, 124, 255, 0.1)',
            borderTopColor: '#4F7CFF',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner ring */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{
            border: '2px solid rgba(123, 97, 255, 0.1)',
            borderTopColor: '#7B61FF',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        {/* Center dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-2.5 h-2.5 rounded-full"
               style={{
                 background: 'linear-gradient(135deg, #4F7CFF, #7B61FF)',
                 boxShadow: '0 0 12px rgba(79, 124, 255, 0.5)',
               }} />
        </motion.div>
      </div>
      <motion.p
        className="text-text-void text-sm mt-4"
        style={{ fontFamily: 'var(--font-mono)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {text}
      </motion.p>
    </div>
  );
}
