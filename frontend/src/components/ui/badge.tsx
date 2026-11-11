import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold tracking-[0.02em] whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current before:content-[''] [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        ok: "bg-ok-soft text-ok",
        warn: "bg-warn-soft text-warn",
        danger: "bg-danger-soft text-danger",
        muted: "bg-white/5 text-muted-foreground",
        accent: "bg-primary text-primary-foreground before:hidden",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
)

function Badge({
  className,
  variant = "muted",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export {
  Badge,
}
