import Link from "next/link";
import { Button } from "./ui/button";

export async function AuthButton() {
  return (
    <div className="flex gap-2">
      <Button asChild size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}