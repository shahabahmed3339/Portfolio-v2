"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AdminCard,
  AdminError,
  AdminField,
  AdminLoginWrapper,
  AdminRoot,
  AdminTextButton,
} from "@/components/admin/styles";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/admin");
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return (
      <AdminRoot>
        <AdminLoginWrapper>
          <p>Checking session...</p>
        </AdminLoginWrapper>
      </AdminRoot>
    );
  }

  return (
    <AdminRoot>
      <AdminLoginWrapper>
        <AdminCard>
          <h1>Admin sign in</h1>
          <p className="sub">Manage portfolio content: projects, experience, skills and more.</p>

          {error ? <AdminError role="alert">{error}</AdminError> : null}

          <form onSubmit={handleSubmit}>
            <AdminField>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@portfolio.local"
                required
              />
            </AdminField>

            <AdminField>
              Password
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="........"
                required
              />
            </AdminField>

            <AdminTextButton type="button" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? "Hide password" : "Show password"}
            </AdminTextButton>

            <button type="submit" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </AdminCard>
      </AdminLoginWrapper>
    </AdminRoot>
  );
}
