import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Staff Sign In — SSN" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "set-password">("signin");

  // Detect invite/recovery links, otherwise auto-redirect signed-in staff to /admin.
  // Supabase refreshes tokens on activity, so anyone active in the last 30 days still has a valid session.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=invite") || hash.includes("type=recovery")) {
      setMode("set-password");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  // PASSWORD_RECOVERY event from Supabase = invite or reset link clicked
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("set-password");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "set-password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password set — welcome to SSN.");
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="p-8 animate-fade-up">
        <h1 className="font-display text-2xl text-center">
          {mode === "set-password" ? "Set Your Password" : "Staff Sign In"}
        </h1>
        <p className="text-xs text-muted-foreground text-center mt-1 tracking-widest font-display uppercase">
          {mode === "set-password" ? "Welcome to SSN" : "SSN Admin Access"}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signin" && (
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="password">{mode === "set-password" ? "Choose a password" : "Password"}</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : mode === "set-password" ? "Set Password & Continue" : "Sign In"}
          </Button>
        </form>
        <p className="mt-6 text-[10px] text-muted-foreground text-center">
          Staff accounts are invite-only. Contact an existing admin to be added.
        </p>
      </Card>
    </div>
  );
}
