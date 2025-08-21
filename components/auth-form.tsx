"use client"

import Link from "next/link"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/auth/actions"

interface AuthFormProps {
  user: User | null;
}

export function AuthForm({ user }: AuthFormProps) {
  return (
    <form action={signOut} className="p-2">
      {user ? (
        <Button type="submit" variant="ghost" className="w-full justify-start">
          Sign Out
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/login">Sign Up</Link>
          </Button>
        </div>
      )}
    </form>
  )
}
