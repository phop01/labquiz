'use client';

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api-client";

interface StatusAuthor {
  _id?: string;
  name?: string;
  email?: string;
  image?: string;
}

interface StatusComment {
  _id: string;
  content: string;
  createdBy: string | StatusAuthor;
  like?: Array<string | StatusAuthor>;
  createdAt?: string;
}

interface StatusItem {
  _id: string;
  content: string;
  createdBy: string | StatusAuthor;
  like?: Array<string | StatusAuthor>;
  likeCount?: number;
  hasLiked?: boolean;
  comment?: StatusComment[];
  createdAt?: string;
  updatedAt?: string;
}

interface StatusListResponse {
  data: StatusItem[];
}

interface StatusMutationResponse {
  data: StatusItem;
}

function displayName(source: StatusItem["createdBy"]) {
  if (!source) return "ไม่ทราบ";
  if (typeof source === "string") return source;
  return source.name ?? source.email ?? "ไม่ทราบ";
}

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function isEntryOwnedByUser(
  entry: string | StatusAuthor | undefined,
  currentUserId?: string,
  currentUserEmail?: string,
) {
  if (!entry) return false;
  if (typeof entry === "string") {
    return entry === currentUserId || entry === currentUserEmail;
  }
  return (
    entry._id === currentUserId ||
    (currentUserEmail ? entry.email === currentUserEmail : false)
  );
}

function normalizeStatus(
  status: StatusItem,
  currentUserId?: string,
  currentUserEmail?: string,
): StatusItem {
  const likeArray = status.like ?? [];
  const likeCount =
    typeof status.likeCount === "number" ? status.likeCount : likeArray.length;

  let hasLiked = status.hasLiked ?? false;
  if (!hasLiked) {
    hasLiked = likeArray.some((entry) =>
      isEntryOwnedByUser(entry, currentUserId, currentUserEmail),
    );
  }

  return {
    ...status,
    like: likeArray,
    likeCount,
    hasLiked,
    comment: status.comment ?? [],
  };
}

function withPreservedAuthors(next: StatusItem, previous?: StatusItem): StatusItem {
  if (!previous) {
    return next;
  }

  let mergedComments = next.comment;
  if (next.comment && next.comment.length > 0 && previous.comment && previous.comment.length > 0) {
    const previousById = new Map(previous.comment.map((comment) => [comment._id, comment]));
    mergedComments = next.comment.map((comment) => {
      if (typeof comment.createdBy === "string") {
        const previousComment = previousById.get(comment._id);
        if (
          previousComment &&
          previousComment.createdBy &&
          typeof previousComment.createdBy !== "string"
        ) {
          return { ...comment, createdBy: previousComment.createdBy };
        }
      }
      return comment;
    });
  }

  const shouldReplaceCreator =
    typeof next.createdBy === "string" &&
    previous.createdBy &&
    typeof previous.createdBy !== "string";

  if (mergedComments !== next.comment || shouldReplaceCreator) {
    return {
      ...next,
      createdBy: shouldReplaceCreator ? previous.createdBy : next.createdBy,
      comment: mergedComments,
    };
  }

  return next;
}

export default function StatusesPage() {
  const { isReady, user } = useAuth();
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentPending, setCommentPending] = useState<Record<string, boolean>>({});
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});

  const currentUserId = user?._id;
  const currentUserEmail = user?.email;
  const isAuthenticated = useMemo(() => isReady && Boolean(user), [isReady, user]);
  const refreshStatuses = useCallback(async () => {
    if (!isAuthenticated) {
      setStatuses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<StatusListResponse>({
        path: "/classroom/status",
        method: "GET",
      });
      const incoming = response.data ?? [];
      setStatuses((prev) => {
        const previousById = new Map(prev.map((item) => [item._id, item]));
        return incoming.map((item) => {
          const normalized = normalizeStatus(item, currentUserId, currentUserEmail);
          return withPreservedAuthors(normalized, previousById.get(item._id));
        });
      });
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "ไม่สามารถโหลดฟีดสถานะได้";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentUserId, currentUserEmail]);


  useEffect(() => {
    void refreshStatuses();
  }, [refreshStatuses]);

  const likeLabel = (status: StatusItem) => {
    const count = status.likeCount ?? status.like?.length ?? 0;
    if (count === 0) return "ยังไม่มีใครถูกใจ";
    if (count === 1) return "1 ถูกใจ";
    return `${count} ถูกใจ`;
  };

  const handlePublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composer.trim()) {
      setError("กรุณาพิมพ์ข้อความก่อนโพสต์");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const response = await apiRequest<StatusMutationResponse>({
        path: "/classroom/status",
        method: "POST",
        body: { content: composer.trim() },
      });
      if (!response.data) {
        await refreshStatuses();
        return;
      }

      const normalized = normalizeStatus(
        response.data,
        currentUserId,
        currentUserEmail,
      );
      setStatuses((prev) => [normalized, ...prev]);
      setComposer("");
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "ไม่สามารถโพสต์สถานะได้";
      setError(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleComment = async (statusId: string) => {
    const draft = commentDrafts[statusId]?.trim();
    if (!draft) return;

    setCommentPending((prev) => ({ ...prev, [statusId]: true }));
    setError(null);

    try {
      const response = await apiRequest<StatusMutationResponse>({
        path: "/classroom/comment",
        method: "POST",
        body: {
          content: draft,
          statusId,
        },
      });
      if (!response.data) {
        await refreshStatuses();
        return;
      }

      const normalized = normalizeStatus(
        response.data,
        currentUserId,
        currentUserEmail,
      );
      setStatuses((prev) =>
        prev.map((item) => (item._id === statusId ? withPreservedAuthors(normalized, item) : item)),
      );
      setCommentDrafts((prev) => ({ ...prev, [statusId]: "" }));
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "ไม่สามารถเพิ่มความคิดเห็นได้";
      setError(message);
    } finally {
      setCommentPending((prev) => ({ ...prev, [statusId]: false }));
    }
  };

  const toggleLike = async (status: StatusItem) => {
    const statusId = status._id;
    const isCurrentlyLiked = Boolean(status.hasLiked);

    setLikePending((prev) => ({ ...prev, [statusId]: true }));
    setError(null);

    const optimisticNext = normalizeStatus(
      {
        ...status,
        likeCount: (status.likeCount ?? status.like?.length ?? 0) +
          (isCurrentlyLiked ? -1 : 1),
        hasLiked: !isCurrentlyLiked,
      },
      currentUserId,
      currentUserEmail,
    );

    setStatuses((prev) =>
      prev.map((item) =>
        item._id === statusId ? withPreservedAuthors(optimisticNext, item) : item,
      ),
    );

    try {
      const response = await apiRequest<StatusMutationResponse>({
        path: "/classroom/like",
        method: "POST",
        body: { statusId, action: isCurrentlyLiked ? "unlike" : "like" },
      });
      if (!response.data) {
        await refreshStatuses();
        return;
      }

      const normalized = normalizeStatus(
        response.data,
        currentUserId,
        currentUserEmail,
      );
      setStatuses((prev) =>
        prev.map((item) => (item._id === statusId ? withPreservedAuthors(normalized, item) : item)),
      );
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "ไม่สามารถอัปเดตการกดถูกใจได้";
      setError(message);
      setStatuses((prev) => prev.map((item) => (item._id === statusId ? status : item)));
    } finally {
      setLikePending((prev) => ({ ...prev, [statusId]: false }));
    }
  };

  if (!isReady) {
    return (
      <section style={{ padding: "64px min(6vw, 72px)" }}>
        <p style={{ fontSize: "1.05rem" }}>กำลังโหลดเซสชัน...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section style={{ padding: "64px min(6vw, 72px)" }}>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", marginBottom: "12px" }}>
          กระดานสถานะ
        </h1>
        <p style={{ fontSize: "1.05rem", color: "rgba(23,23,23,0.7)" }}>
          กรุณาเข้าสู่ระบบเพื่อดูและโต้ตอบกับสถานะ
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        padding: "64px min(6vw, 72px) 120px",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        background: "linear-gradient(140deg, rgba(48,84,150,0.06), rgba(156,218,255,0.1))",
      }}
    >
      <Link
        href="/profile"
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          gap: "8px",
          alignItems: "center",
          padding: "8px 16px",
          borderRadius: "999px",
          border: "1px solid rgba(23,23,23,0.12)",
          background: "#fff",
          color: "rgba(23,23,23,0.78)",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        ← ย้อนกลับ
      </Link>

      <header style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p
          style={{
            display: "inline-flex",
            padding: "6px 14px",
            borderRadius: "999px",
            background: "rgba(48,84,150,0.12)",
            fontWeight: 600,
            color: "rgba(23,23,23,0.78)",
          }}
        >
          แบ่งปันอัปเดตกับเพื่อนร่วมรุ่น
        </p>
        <h1 style={{ fontSize: "clamp(2.25rem, 5vw, 3rem)", lineHeight: 1.1 }}>
          กระดานสถานะ
        </h1>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "rgba(23,23,23,0.7)" }}>
          โพสต์อัปเดตสั้น ๆ พูดคุยกับเพื่อนร่วมชั้น และร่วมยินดีด้วยการกดถูกใจและแสดงความคิดเห็น
        </p>
      </header>

      <form
        onSubmit={handlePublish}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "24px",
          borderRadius: "20px",
          border: "1px solid rgba(23,23,23,0.08)",
          background: "#fff",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontWeight: 600 }}>สร้างสถานะ</span>
          <textarea
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            placeholder="แบ่งปันสิ่งที่อยากบอกเพื่อนร่วมชั้น..."
            rows={4}
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(23,23,23,0.12)",
              fontSize: "1rem",
              resize: "vertical",
            }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "rgba(23,23,23,0.6)", fontSize: "0.95rem" }}>
            Posting as {user.firstname} {user.lastname}
          </p>
          <button
            type="submit"
            disabled={isPublishing}
            style={{
              padding: "10px 20px",
              borderRadius: "999px",
              border: "none",
              fontWeight: 600,
              background: "rgba(48,84,150,1)",
              color: "#fff",
              cursor: isPublishing ? "not-allowed" : "pointer",
              opacity: isPublishing ? 0.75 : 1,
            }}
          >
            {isPublishing ? "กำลังโพสต์..." : "โพสต์"}
          </button>
        </div>
      </form>

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
        <p style={{ fontSize: "1.05rem" }}>Loading feed...</p>
      ) : null}

      {!isLoading && statuses.length === 0 ? (
        <p style={{ fontSize: "1.05rem", color: "rgba(23,23,23,0.7)" }}>
          ยังไม่มีสถานะ เริ่มการสนทนาเป็นคนแรกเลย!
        </p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {statuses.map((status) => {
          const likeText = likeLabel(status);
          const comments = status.comment ?? [];
          const draftValue = commentDrafts[status._id] ?? "";

          return (
            <article
              key={status._id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                padding: "24px",
                borderRadius: "20px",
                border: "1px solid rgba(23,23,23,0.08)",
                background: "#fff",
              }}
            >
              <header style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>{displayName(status.createdBy)}</h2>
                {status.createdAt ? (
                  <span style={{ color: "rgba(23,23,23,0.6)", fontSize: "0.9rem" }}>
                    {formatDate(status.createdAt)}
                  </span>
                ) : null}
              </header>

              <p style={{ fontSize: "1.05rem", lineHeight: 1.6 }}>{status.content}</p>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => toggleLike(status)}
                  disabled={likePending[status._id]}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "999px",
                    border: "1px solid rgba(48,84,150,0.2)",
                    background: status.hasLiked ? "rgba(48,84,150,0.12)" : "transparent",
                    fontWeight: 600,
                    cursor: likePending[status._id] ? "not-allowed" : "pointer",
                  }}
                >
                  {status.hasLiked ? `ยกเลิกถูกใจ (${likeText})` : likeText}
                </button>
                <span style={{ color: "rgba(23,23,23,0.6)", fontSize: "0.9rem" }}>
                  {comments.length} ความคิดเห็น
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {comments.map((comment) => (
                  <div
                    key={comment._id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "16px",
                      background: "rgba(23,23,23,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <span style={{ fontWeight: 600 }}>
                        {displayName(comment.createdBy as StatusItem["createdBy"])}
                      </span>
                      {comment.createdAt ? (
                        <span style={{ color: "rgba(23,23,23,0.6)", fontSize: "0.85rem" }}>
                          {formatDate(comment.createdAt)}
                        </span>
                      ) : null}
                    </div>
                    <p style={{ fontSize: "0.98rem", lineHeight: 1.5 }}>{comment.content}</p>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    borderTop: "1px solid rgba(23,23,23,0.08)",
                    paddingTop: "12px",
                  }}
                >
                  <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span style={{ fontWeight: 600 }}>เพิ่มความคิดเห็น</span>
                    <textarea
                      value={draftValue}
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({ ...prev, [status._id]: event.target.value }))
                      }
                      rows={3}
                      placeholder="ร่วมแสดงความคิดเห็น..."
                      style={{
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(23,23,23,0.12)",
                        fontSize: "1rem",
                        resize: "vertical",
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleComment(status._id)}
                    disabled={commentPending[status._id]}
                    style={{
                      alignSelf: "flex-start",
                      padding: "8px 16px",
                      borderRadius: "999px",
                      border: "none",
                      fontWeight: 600,
                      background: "rgba(48,84,150,1)",
                      color: "#fff",
                      cursor: commentPending[status._id] ? "not-allowed" : "pointer",
                      opacity: commentPending[status._id] ? 0.75 : 1,
                    }}
                  >
                    {commentPending[status._id] ? "กำลังโพสต์..." : "แสดงความคิดเห็น"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}


