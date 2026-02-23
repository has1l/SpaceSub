export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-8 w-8 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
    </div>
  );
}
