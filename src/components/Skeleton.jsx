export default function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-white/5 backdrop-blur-md border border-white/10 rounded-xl ${className}`}></div>
  );
}
