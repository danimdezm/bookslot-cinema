import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-[shimmer_1.4s_ease-in-out_infinite] rounded-lg bg-linear-90 from-surface via-surface-2 to-surface bg-size-[200%_100%]", className)}
      {...props}
    />
  )
}

export { Skeleton }
