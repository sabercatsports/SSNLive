import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; redirectTo: string }) => {
    if (!input?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new Error("Invalid email");
    }
    if (!input?.redirectTo) throw new Error("Missing redirectTo");
    return { email: input.email.trim().toLowerCase(), redirectTo: input.redirectTo };
  })
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try to invite. If the user already exists, surface a friendly error.
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { redirectTo: data.redirectTo },
    );
    if (error) throw new Error(error.message);
    const newUserId = invited?.user?.id;
    if (!newUserId) throw new Error("Invite created but no user id returned");

    // Grant admin role immediately so the new staff member can edit on first login.
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "admin" });
    // Ignore duplicate-key errors silently
    if (roleErr && !/duplicate/i.test(roleErr.message)) throw new Error(roleErr.message);

    return { ok: true, email: data.email };
  });
