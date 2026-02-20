interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-dark-card border border-dark-border rounded-lg ${className}`}
    />
  );
}
