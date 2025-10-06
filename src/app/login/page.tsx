'use client';

import { FormEvent, useEffect, useState } from "react";
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

const palette = {
  primary: "#2e7d32",
  primaryDark: "#1b5e20",
  accent: "#a5d6a7",
  backgroundStart: "#e8f5e9",
  backgroundEnd: "#f1f8e9",
};

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, user, isReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && user) {
      router.replace("/profile");
    }
  }, [isReady, user, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
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
      setSuccess("เข้าสู่ระบบสำเร็จ กำลังพาไปยังหน้าโปรไฟล์...");
      router.push("/profile");
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูลอีกครั้ง";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    setEmail("");
    setPassword("");
    setSuccess("ออกจากระบบเรียบร้อยแล้ว");
  };

  return (
    <section
      style={{
        padding: "80px min(6vw, 96px)",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(160deg, ${palette.backgroundStart}, ${palette.backgroundEnd})`,
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          backgroundColor: "#ffffff",
          borderRadius: "28px",
          padding: "44px",
          boxShadow: "0 22px 45px rgba(33, 56, 41, 0.18)",
          border: "1px solid rgba(46,125,50,0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p
            style={{
              display: "inline-flex",
              padding: "6px 16px",
              borderRadius: "999px",
              background: `${palette.accent}55`,
              fontWeight: 600,
              color: palette.primaryDark,
              alignSelf: "flex-start",
            }}
          >
            เข้าสู่ระบบด้วยบัญชี CIS
          </p>
          <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.5rem)", marginBottom: "4px" }}>ยินดีต้อนรับกลับ</h1>
          <p style={{ color: "rgba(33,56,41,0.75)", lineHeight: 1.6 }}>
            กรุณาลงชื่อเข้าใช้เพื่อเข้าถึงรายชื่อเพื่อนร่วมชั้นและกระดานสถานะ รวมถึงบริการอื่น ๆ ของแอป
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontWeight: 600, color: palette.primaryDark }}>อีเมล</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@example.com"
              style={{
                padding: "12px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(33,56,41,0.14)",
                fontSize: "1rem",
                background: "rgba(245,249,246,0.85)",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontWeight: 600, color: palette.primaryDark }}>รหัสผ่าน</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              style={{
                padding: "12px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(33,56,41,0.14)",
                fontSize: "1rem",
                background: "rgba(245,249,246,0.85)",
              }}
            />
          </label>

          {error ? (
            <p style={{ color: "#b42318", fontWeight: 500 }}>{error}</p>
          ) : success ? (
            <p style={{ color: palette.primaryDark, fontWeight: 500 }}>{success}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: "4px",
              padding: "12px 16px",
              borderRadius: "999px",
              fontSize: "1.05rem",
              fontWeight: 600,
              border: "none",
              background: isSubmitting ? `${palette.primary}80` : palette.primary,
              color: "#fff",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
            }}
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        {user ? (
          <div
            style={{
              marginTop: "4px",
              padding: "18px",
              borderRadius: "16px",
              background: "rgba(165,214,167,0.35)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.02rem", marginBottom: "4px", fontWeight: 600, color: palette.primaryDark }}>
                สถานะการเข้าสู่ระบบปัจจุบัน
              </h2>
              <p>
                กำลังใช้งานในชื่อ {user.firstname} {user.lastname} ({user.email})
              </p>
              <p style={{ opacity: 0.75 }}>โทเคนสำหรับเรียก API ถูกเก็บไว้บนเบราว์เซอร์ของคุณ</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                alignSelf: "flex-start",
                padding: "10px 20px",
                borderRadius: "999px",
                border: "none",
                fontWeight: 600,
                background: "rgba(211,47,47,0.15)",
                color: "#8a1f16",
                cursor: "pointer",
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
