'use client';

import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api-client";

interface Member {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  image?: string;
  role?: string;
  type?: string;
  education?: {
    major?: string;
    enrollmentYear?: string;
    studentId?: string;
    school?: {
      name?: string;
      province?: string;
      logo?: string;
    };
  };
}

interface MembersResponse {
  data: Member[];
}

const currentYear = new Date().getFullYear();

function buildYearOptions(range = 6) {
  return Array.from({ length: range }, (_, index) => String(currentYear - index));
}

export default function MembersPage() {
  const { isReady, user } = useAuth();
  const [year, setYear] = useState(String(currentYear));
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const yearOptions = useMemo(() => buildYearOptions(10), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!year) {
      setError("Please enter an enrollment year");
      return;
    }

    if (!isReady) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<MembersResponse>({
        path: `/classroom/class?year=${encodeURIComponent(year)}`,
        method: "GET",
      });

      setMembers(response.data);
      setHasSearched(true);
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "Unable to fetch class members";
      setError(message);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      style={{
        padding: "64px min(6vw, 72px)",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      <header style={{ maxWidth: "760px" }}>
        <p
          style={{
            display: "inline-flex",
            padding: "6px 14px",
            borderRadius: "999px",
            background: "rgba(48,84,150,0.1)",
            fontWeight: 600,
            color: "rgba(23,23,23,0.78)",
            marginBottom: "16px",
          }}
        >
          Cohort directory
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", marginBottom: "12px" }}>
          Search classmates by enrollment year
        </h1>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "rgba(23,23,23,0.7)" }}>
          Provide a year (CE) to retrieve the classmates list via the <code>/classroom/class</code> endpoint, including majors and school information.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "flex-end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "220px" }}>
          <span style={{ fontWeight: 600 }}>Enrollment year (CE)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1900"
            max="2100"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="2023"
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(23,23,23,0.12)",
              fontSize: "1rem",
            }}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontWeight: 600 }}>Quick select</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {yearOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setYear(option)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "999px",
                  border: option === year ? "1px solid rgba(48,84,150,1)" : "1px solid rgba(23,23,23,0.12)",
                  background: option === year ? "rgba(48,84,150,0.12)" : "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "12px 24px",
            borderRadius: "999px",
            fontSize: "1.05rem",
            fontWeight: 600,
            border: "none",
            background: "rgba(48,84,150,1)",
            color: "#fff",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.75 : 1,
          }}
        >
          {isLoading ? "Loading..." : "Search"}
        </button>
      </form>

      {!user && isReady ? (
        <p style={{ color: "#b42318", fontWeight: 500 }}>
          Please sign in first so we can attach your token to the request.
        </p>
      ) : null}

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

      {hasSearched && !error && members.length === 0 ? (
        <p style={{ color: "rgba(23,23,23,0.7)", fontSize: "1.05rem" }}>
          No classmates found for {year}.
        </p>
      ) : null}

      {members.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {members.map((member) => (
            <article
              key={member._id}
              style={{
                borderRadius: "20px",
                border: "1px solid rgba(23,23,23,0.08)",
                padding: "20px",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>
                {member.firstname} {member.lastname}
              </h2>
              <p style={{ fontSize: "0.95rem", color: "rgba(23,23,23,0.7)" }}>{member.email}</p>
              {member.education?.major ? (
                <p style={{ fontSize: "0.95rem" }}>
                  <strong>Major:</strong> {member.education.major}
                </p>
              ) : null}
              {member.education?.studentId ? (
                <p style={{ fontSize: "0.95rem" }}>
                  <strong>Student ID:</strong> {member.education.studentId}
                </p>
              ) : null}
              {member.education?.school?.name ? (
                <p style={{ fontSize: "0.95rem" }}>
                  <strong>School:</strong> {member.education.school.name}
                  {member.education.school.province ? `, ${member.education.school.province}` : ""}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
