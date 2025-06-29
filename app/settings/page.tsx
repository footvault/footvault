import { getUserProfile } from "./actions"
import { SettingsForm } from "../../components/settings-form"

export default async function SettingsPage() {
  const user = await getUserProfile()

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500">Manage your account settings and preferences.</p>
        </div>
        <SettingsForm user={user} />
      </div>
    </div>
  )
}
