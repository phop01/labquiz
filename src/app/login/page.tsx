'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api-client";
import type { StoredUser } from "@/lib/auth-storage";

interface SignInResponse {
  data: {
    _id: string;
    firstname: string;
    lastname: string;
    email: string;
    image?: string;
    role?: string;
    type?: string;
    token: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please provide both email and password");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest<SignInResponse>({
        path: "/auth/signin",
        method: "POST",
        requiresAuth: false,
        body: {
          email: trimmedEmail,
          password: trimmedPassword,
        },
      });

      const sessionUser: StoredUser = {
        _id: response.data._id,
        firstname: response.data.firstname,
        lastname: response.data.lastname,
        email: response.data.email,
        image: response.data.image,
        role: response.data.role,
        type: response.data.type,
      };

      login({ token: response.data.token, user: sessionUser });
      setSuccess("Signed in successfully. Redirecting to profile...");
      router.push("/profile");
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "Unable to sign in. Please verify your credentials.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    setEmail("");
    setPassword("");
    setSuccess("You have been signed out.");
  };

  return (
    <section
      style={{
        padding: "64px min(6vw, 72px)",
        minHeight: "calc(100vh - 120px)",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, rgba(48,84,150,0.08), rgba(156,218,255,0.12))",
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          backgroundColor: "rgba(255,255,255,0.96)",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 18px 40px rgba(36, 72, 124, 0.14)",
          backdropFilter: "blur(4px)",
        }}
      >
        <header style={{ marginBottom: "28px" }}>
          <p
            style={{
              display: "inline-flex",
              padding: "6px 14px",
              borderRadius: "999px",
              background: "rgba(48,84,150,0.12)",
              fontWeight: 600,
              color: "rgba(23,23,23,0.78)",
              marginBottom: "18px",
            }}
          >
            Sign in with your CIS account
          </p>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", marginBottom: "12px" }}>Sign in</h1>
          <p style={{ color: "rgba(23,23,23,0.72)", lineHeight: 1.6 }}>
            Enter your CIS credentials to obtain an access token for the classroom services.
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontWeight: 600 }}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(23,23,23,0.12)",
                fontSize: "1rem",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontWeight: 600 }}>Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(23,23,23,0.12)",
                fontSize: "1rem",
              }}
            />
          </label>

          {error ? (
            <p style={{ color: "#b42318", fontWeight: 500 }}>{error}</p>
          ) : success ? (
            <p style={{ color: "#137333", fontWeight: 500 }}>{success}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: "8px",
              padding: "12px 16px",
              borderRadius: "999px",
              fontSize: "1.05rem",
              fontWeight: 600,
              border: "none",
              background: "rgba(48,84,150,1)",
              color: "#fff",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {user ? (
          <div
            style={{
              marginTop: "32px",
              padding: "16px",
              borderRadius: "14px",
              background: "rgba(156,218,255,0.16)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.05rem", marginBottom: "8px", fontWeight: 600 }}>Current session</h2>
              <p>
                Signed in as {user.firstname} {user.lastname} ({user.email})
              </p>
              <p style={{ opacity: 0.7 }}>
                The access token is stored in your browser for subsequent API calls.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                alignSelf: "flex-start",
                padding: "10px 18px",
                borderRadius: "999px",
                border: "none",
                fontWeight: 600,
                background: "rgba(180,35,24,0.12)",
                color: "#8a1f16",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
