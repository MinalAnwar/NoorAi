import { cn } from "@/utils/cn";

/**
 * Renders a shimmering skeleton placeholder to signify content is fetching.
 * Conforms with tasteskill.md Rule 5 by matching component shapes perfectly.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-800/40 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
