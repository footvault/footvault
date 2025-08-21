import { Spinner } from "@/components/ui/spinner"

export default function RootLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600">Loading FootVault...</p>
      </div>
    </div>
  )
}