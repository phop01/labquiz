'use client';

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api-client";

interface ProfileData {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  image?: string;
  role?: string;
  type?: string;
  confirmed?: boolean;
  education?: {
    major?: string;
    enrollmentYear?: string;
    studentId?: string;
    school?: {
      _id?: string;
      name?: string;
      province?: string;
      logo?: string;
    };
    advisor?: {
      _id?: string;
      name?: string;
      email?: string;
      image?: string;
    };
    image?: string;
  };
  job?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileResponse {
  data: ProfileData;
}

const quickLinks = [
  {
    href: "/members",
    title: "รายชื่อรุ่น",
    description: "ดูรายชื่อเพื่อนร่วมรุ่นตามปีการเข้าเรียน",
  },
  {
    href: "/statuses",
    title: "กระดานสถานะ",
    description: "โพสต์อัปเดต แสดงความคิดเห็น และโต้ตอบกับสถานะของเพื่อนร่วมรุ่น",
  },
];

function normalizeProfile(data: ProfileData): ProfileData {
  return {
    ...data,
    education: data.education ?? {},
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { isReady, user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (!profile) return "";
    return `${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim();
  }, [profile]);

  useEffect(() => {
    if (isReady && !user) {
      router.replace("/login");
    }
  }, [isReady, user, router]);

  useEffect(() => {
    if (!isReady || !user) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiRequest<ProfileResponse>({
          path: "/classroom/profile",
          method: "GET",
        });
        setProfile(normalizeProfile(response.data));
      } catch (apiError) {
        const message =
          typeof apiError === "object" && apiError !== null && "message" in apiError
            ? String((apiError as { message: unknown }).message)
            : "Unable to load profile information";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isReady, user]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!isReady) {
    return (
      <section style={{ padding: "80px min(6vw, 96px)", minHeight: "60vh" }}>
        <p style={{ fontSize: "1.05rem" }}>Loading session...</p>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <section
      style={{
        padding: "80px min(6vw, 96px) 120px",
        display: "flex",
        flexDirection: "column",
        gap: "40px",
        background: "linear-gradient(160deg, rgba(48,84,150,0.08), rgba(156,218,255,0.12))",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
          {profile?.image ? (
            <Image
              src={profile.image}
              alt={displayName || "Profile photo"}
              width={84}
              height={84}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <p
              style={{
                display: "inline-flex",
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(48,84,150,0.12)",
                fontWeight: 600,
                color: "rgba(23,23,23,0.78)",
                width: "fit-content",
              }}
            >
              Signed in via CIS
            </p>
            <h1 style={{ fontSize: "clamp(2.25rem, 5vw, 3rem)", lineHeight: 1.1 }}>{displayName || user.firstname}</h1>
            <p style={{ fontSize: "1.05rem", color: "rgba(23,23,23,0.72)" }}>{profile?.email ?? user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            alignSelf: "flex-start",
            padding: "12px 20px",
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
      </header>

      {error ? (
        <div
          style={{
            padding: "18px",
            borderRadius: "16px",
            background: "rgba(180,35,24,0.08)",
            color: "#8a1f16",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p style={{ fontSize: "1.05rem" }}>Loading profile details...</p>
      ) : null}

      {profile ? (
        <>
          <div
            style={{
              display: "grid",
              gap: "24px",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            <article
              style={{
                borderRadius: "24px",
                background: "#fff",
                padding: "28px",
                border: "1px solid rgba(23,23,23,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Account</h2>
              {profile.role ? <p>Role: {profile.role}</p> : null}
              {profile.type ? <p>Program type: {profile.type}</p> : null}
              <p>Verification: {profile.confirmed ? "Verified" : "Pending"}</p>
              {profile.createdAt ? (
                <p style={{ color: "rgba(23,23,23,0.6)", fontSize: "0.95rem" }}>
                  Member since {new Date(profile.createdAt).toLocaleDateString("th-TH")}
                </p>
              ) : null}
            </article>

            <article
              style={{
                borderRadius: "24px",
                background: "#fff",
                padding: "28px",
                border: "1px solid rgba(23,23,23,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Education</h2>
              {profile.education?.major ? <p>Major: {profile.education.major}</p> : null}
              {profile.education?.enrollmentYear ? (
                <p>Enrollment year: {profile.education.enrollmentYear}</p>
              ) : null}
              {profile.education?.studentId ? <p>Student ID: {profile.education.studentId}</p> : null}
              {profile.education?.school?.name ? (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {profile.education.school.logo ? (
                    <Image
                      src={profile.education.school.logo}
                      alt={profile.education.school.name ?? "School logo"}
                      width={48}
                      height={48}
                      style={{ borderRadius: "12px", objectFit: "cover" }}
                    />
                  ) : null}
                  <div>
                    <p>School: {profile.education.school.name}</p>
                    {profile.education.school.province ? (
                      <p>Province: {profile.education.school.province}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>

            {profile.education?.advisor ? (
              <article
                style={{
                  borderRadius: "24px",
                  background: "#fff",
                  padding: "28px",
                  border: "1px solid rgba(23,23,23,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Advisor</h2>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  {profile.education.advisor.image ? (
                    <Image
                      src={profile.education.advisor.image}
                      alt={profile.education.advisor.name ?? "Advisor"}
                      width={64}
                      height={64}
                      style={{ borderRadius: "16px", objectFit: "cover" }}
                    />
                  ) : null}
                  <div>
                    <p style={{ fontWeight: 600 }}>{profile.education.advisor.name}</p>
                    {profile.education.advisor.email ? (
                      <p style={{ color: "rgba(23,23,23,0.7)" }}>{profile.education.advisor.email}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            ) : null}
          </div>

          <section
            style={{
              display: "grid",
              gap: "20px",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {quickLinks.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                style={{
                  borderRadius: "20px",
                  border: "1px solid rgba(23,23,23,0.08)",
                  background: "#fff",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  textDecoration: "none",
                }}
              >
                <h2 style={{ fontSize: "1.3rem", fontWeight: 600 }}>{card.title}</h2>
                <p style={{ fontSize: "1rem", color: "rgba(23,23,23,0.7)", lineHeight: 1.6 }}>{card.description}</p>
                <span style={{ fontWeight: 600, color: "rgba(48,84,150,1)" }}>ไปที่ {card.title}</span>
              </Link>
            ))}
          </section>
        </>
      ) : null}
    </section>
  );
}
