"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EnvelopeSimple, GoogleLogo } from "@phosphor-icons/react";
import Mark from "@/components/Mark";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState(params.get("error") ? "Sign-in didn't complete. Try again." : "");
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
    if (error) { setState("idle"); setError(error.message); } else setState("sent");
  };
  const google = async () => {
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) setError(error.message);
  };

  return (
    <div className="auth">
      <Mark />
      <h1>Sign in</h1>
      <p className="lede" style={{ margin: 0 }}>Your checklist and trade log sync across your devices. Only you can see them.</p>
      <button className="btn block" onClick={google}><GoogleLogo size={22} weight="bold" />Continue with Google</button>
      <div className="divider">or use email</div>
      {state === "sent" ? (
        <p className="msg" role="status">Check {email} for a sign-in link. It works once and opens this app.</p>
      ) : (
        <form onSubmit={magic}>
          <div className="f">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn ghost block" type="submit" disabled={state === "sending"}>
            <EnvelopeSimple size={22} weight="bold" />{state === "sending" ? "Sending" : "Email me a link"}
          </button>
        </form>
      )}
      {error && <p className="msg err" role="alert">{error}</p>}
      <p className="sub">Candle Three is a journaling and education tool. It does not place trades and does not give buy or sell signals.</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
