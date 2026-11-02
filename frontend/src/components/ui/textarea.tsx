import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full resize-y rounded-lg border border-input bg-black/25 px-3.5 py-3 transition-[border-color,box-shadow,background-color] duration-200 outline-none placeholder:text-faint hover:border-[rgba(255,236,214,0.24)] focus:border-primary focus:bg-black/35 focus:ring-4 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
