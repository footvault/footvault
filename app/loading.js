import { Spinner } from "@/components/ui/spinner"

export default function RootLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4 text-center">
        <Spinner size="xl" className="animate-pulse" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">Loading FootVault...</p>
          <p className="text-sm text-muted-foreground">Please wait while we initialize the application</p>
        </div>
      </div>
    </div>
  )
}