"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUpWithEmail } from "@/app/auth/actions"

export default function SignupPage() {
  const [state, action, isPending] = useActionState(
    async (_state: { success: boolean; message: string } | null, formData: FormData) => {
      return await signUpWithEmail(formData)
    },
    null
  )

  return (
    <div className="flex min-h-[calc(100svh-64px)] items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Enter your email below to create your account</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form action={action} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state?.message && (
              <p className={`text-sm ${state.success ? "text-green-500" : "text-red-500"}`}>{state.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
