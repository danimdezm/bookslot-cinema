import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent font-semibold tracking-[-0.005em] whitespace-nowrap select-none transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-250 ease-(--ease) active:not-disabled:translate-y-px active:not-disabled:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-(image:--grad) text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_30px_-12px_var(--accent-glow)] hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),var(--shadow-glow)]",
        outline:
          "border-line-strong bg-white/[0.02] hover:not-disabled:border-primary/50 hover:not-disabled:bg-accent-soft aria-expanded:bg-accent-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:not-disabled:bg-surface-2",
        ghost:
          "text-text-2 hover:not-disabled:bg-white/5 hover:not-disabled:text-foreground aria-expanded:bg-white/5",
        destructive:
          "border-danger/25 bg-danger-soft text-danger hover:not-disabled:bg-danger/20",
        subtle:
          "border-line bg-white/[0.03] text-text-2 hover:not-disabled:bg-white/8 hover:not-disabled:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-[14.5px]",
        sm: "h-[34px] px-3.5 text-[13px]",
        lg: "h-[54px] px-7 text-[15.5px]",
        icon: "size-9 text-xl leading-none",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    compoundVariants: [{ variant: "ghost", size: "default", class: "px-3.5" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
