import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button"; 
import { ThemeSwitcher } from "./theme-switcher"; 
import { cookies } from "next/headers";

export async function AuthButton() {
  const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
   
    </div>
  );
}
