import { cn } from "@/lib/utils"

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16",
    xl: "w-20 h-20"
  }

  return (
    <div
      className={cn(
        "loader aspect-square rounded-full border-8 border-black",
        sizeClasses[size],
        className
      )}
    />
  )
}

// If you want to use it in a centered container
export function SpinnerContainer({ children, className }: { children?: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[200px] space-y-4", className)}>
      <Spinner size="lg" />
      {children && (
        <p className="text-sm text-gray-600 animate-pulse">{children}</p>
      )}
    </div>
  )
}
