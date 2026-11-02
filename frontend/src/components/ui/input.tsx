import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[46px] w-full min-w-0 rounded-lg border border-input bg-black/25 px-3.5 [color-scheme:dark] transition-[border-color,box-shadow,background-color] duration-200 outline-none placeholder:text-faint hover:border-[rgba(255,236,214,0.24)] focus:border-primary focus:bg-black/35 focus:ring-4 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive read-only:focus:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }
