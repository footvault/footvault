import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  let next = searchParams.get("next") ?? "/inventory";
  if (!next.startsWith("/")) next = "/inventory";

  console.log("Auth callback called with:", {
    code: code ? "present" : "missing",
    error,
    errorDescription,
    searchParams: Object.fromEntries(searchParams),
  });

  // Handle OAuth errors from provider
  if (error) {
    console.error("OAuth provider error:", { error, errorDescription });
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${error}&error_description=${encodeURIComponent(
        errorDescription || "OAuth provider error"
      )}`
    );
  }

  if (code) {
    try {
      // 1. use cookie-aware client for exchanging code
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      const { data, error: exchangeError } =
        await (await supabase).auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Auth exchange error:", exchangeError);
        return NextResponse.redirect(
          `${origin}/auth/auth-code-error?error=server_error&error_code=auth_exchange_failed&error_description=Failed+to+exchange+authorization+code:+${encodeURIComponent(
            exchangeError.message
          )}`
        );
      }

      const { user } = data;
      console.log("User object:", user);

      if (user) {
        // 2. use admin client for inserting into your tables
        const adminClient = await createAdminClient();

        // Check if user already exists
        const { data: existingUser, error: userCheckError } = await adminClient
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        console.log("Existing user found:", existingUser ? "Yes" : "No");
        if (userCheckError) {
          console.log("User check error:", userCheckError);
        }

        if (!existingUser) {
          const plan = "Free";
          const email = user.email || "NoEmail";
          const currency = "USD";
          const username =
            user.user_metadata.full_name ?? email ?? "NoName";

          const { error: insertUserError } = await adminClient
            .from("users")
            .insert({
              id: user.id,
              username: username,
              plan: plan,
              email: email,
              currency: currency,
              timezone: "America/New_York",
            });

          if (insertUserError) {
            console.error("Insert user error:", insertUserError);
            return NextResponse.redirect(
              `${origin}/auth/auth-code-error?error=server_error&error_code=user_creation_failed&error_description=Database+error+saving+new+user:+${encodeURIComponent(
                insertUserError.message
              )}`
            );
          }

          // Check/Create Main avatar
          const { data: existingAvatar, error: avatarCheckError } =
            await adminClient
              .from("avatars")
              .select("id")
              .eq("user_id", user.id)
              .eq("type", "Main")
              .single();

          if (avatarCheckError && avatarCheckError.code !== "PGRST116") {
            console.error("Avatar check error:", avatarCheckError);
          }

          if (!existingAvatar) {
            const avatarName = "Main";
            const googleImage = user.user_metadata.avatar_url || null;
            const fallbackInitials =
              email
                .split("@")[0]
                .split(/[._-]/)
                .map((part: string) => part[0]?.toUpperCase())
                .join("")
                .slice(0, 2) || "NN";
            const fallbackAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`;
            const avatarImage = googleImage ?? fallbackAvatarUrl;

            const { error: insertAvatarError } = await adminClient
              .from("avatars")
              .insert({
                name: avatarName,
                user_id: user.id,
                default_percentage: 100.0,
                image: avatarImage,
                type: "Main",
              });

            if (insertAvatarError) {
              console.error("Insert avatar error:", insertAvatarError);
              // continue even if avatar creation fails
            }
          } else {
            console.log(
              "Main avatar already exists for user, skipping creation"
            );
          }

          // Default payment type
          const { error: insertPaymentError } = await adminClient
            .from("payment_types")
            .insert({
              user_id: user.id,
              name: "Cash",
              fee_type: "fixed",
              fee_value: 0.0,
            });

          if (insertPaymentError) {
            console.error("Insert payment type error:", insertPaymentError);
            // continue even if payment type creation fails
          }

          console.log("New user profile created successfully");
        } else {
          console.log("User already exists, skipping creation");
        }
      }

      // Redirect logic
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (unexpectedError) {
      console.error("Unexpected error in auth callback:", unexpectedError);
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=server_error&error_code=unexpected_error&error_description=An+unexpected+error+occurred+during+authentication`
      );
    }
  }

  // No code param
  return NextResponse.redirect(
    `${origin}/auth/auth-code-error?error=invalid_request&error_code=missing_code&error_description=Authorization+code+missing`
  );
}
