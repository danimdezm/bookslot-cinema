import { Toaster as Sonner, type ToasterProps } from "sonner"

const dot = (color: string) => (
  <span className="mt-1.5 size-2 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
)

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      duration={5200}
      visibleToasts={4}
      icons={{
        success: dot("var(--ok)"),
        info: dot("var(--accent)"),
        warning: dot("var(--warn)"),
        error: dot("var(--danger)"),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(380px,calc(100vw-40px))] items-start gap-3 rounded-lg border border-line-strong bg-[rgba(31,27,23,0.92)] px-4 py-3.5 text-foreground shadow-(--shadow) backdrop-blur-[16px]",
          icon: "m-0 flex size-2 shrink-0",
          title: "text-sm font-semibold",
          description: "mt-0.5 text-[13px] text-text-2",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
