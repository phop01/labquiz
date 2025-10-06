'use client';

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  if (!source) return "Unknown";
  if (typeof source === "string") return source;
  return source.name ?? source.email ?? "Unknown";
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStatuses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiRequest<StatusListResponse>({
          path: "/classroom/status",
          method: "GET",
        });
        const normalized = response.data.map((item) =>
          normalizeStatus(item, currentUserId, currentUserEmail),
        );
        setStatuses(normalized);
      } catch (apiError) {
        const message =
          typeof apiError === "object" && apiError !== null && "message" in apiError
            ? String((apiError as { message: unknown }).message)
            : "Unable to load status feed";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatuses();
  }, [isAuthenticated, currentUserId, currentUserEmail]);

  const likeLabel = (status: StatusItem) => {
    const count = status.likeCount ?? status.like?.length ?? 0;
    if (count === 0) return "Be the first to like";
    if (count === 1) return "1 like";
    return `${count} likes`;
  };

  const handlePublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composer.trim()) {
      setError("Please write something before publishing");
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
          : "Unable to publish status";
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
      const normalized = normalizeStatus(
        response.data,
        currentUserId,
        currentUserEmail,
      );
      setStatuses((prev) => prev.map((item) => (item._id === statusId ? normalized : item)));
      setCommentDrafts((prev) => ({ ...prev, [statusId]: "" }));
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "Unable to add comment";
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

    setStatuses((prev) => prev.map((item) => (item._id === statusId ? optimisticNext : item)));

    try {
      const response = await apiRequest<StatusMutationResponse>({
        path: isCurrentlyLiked ? "/classroom/unlike" : "/classroom/like",
        method: "POST",
        body: { statusId },
      });
      const normalized = normalizeStatus(
        response.data,
        currentUserId,
        currentUserEmail,
      );
      setStatuses((prev) => prev.map((item) => (item._id === statusId ? normalized : item)));
    } catch (apiError) {
      const message =
        typeof apiError === "object" && apiError !== null && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "Unable to update like status";
      setError(message);
      setStatuses((prev) => prev.map((item) => (item._id === statusId ? status : item)));
    } finally {
      setLikePending((prev) => ({ ...prev, [statusId]: false }));
    }
  };

  if (!isReady) {
    return (
      <section style={{ padding: "64px min(6vw, 72px)" }}>
        <p style={{ fontSize: "1.05rem" }}>Loading session...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section style={{ padding: "64px min(6vw, 72px)" }}>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", marginBottom: "12px" }}>
          Status board
        </h1>
        <p style={{ fontSize: "1.05rem", color: "rgba(23,23,23,0.7)" }}>
          Please sign in to view and interact with statuses.
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
          Share updates with your cohort
        </p>
        <h1 style={{ fontSize: "clamp(2.25rem, 5vw, 3rem)", lineHeight: 1.1 }}>
          Status board
        </h1>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "rgba(23,23,23,0.7)" }}>
          Post quick updates, discuss with classmates, and celebrate each other using like and comment actions.
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
          <span style={{ fontWeight: 600 }}>Create a status</span>
          <textarea
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            placeholder="Share something with your classmates..."
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
            {isPublishing ? "Publishing..." : "Publish"}
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
          No statuses yet. Be the first to start the conversation!
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
                  {status.hasLiked ? `Unlike (${likeText})` : likeText}
                </button>
                <span style={{ color: "rgba(23,23,23,0.6)", fontSize: "0.9rem" }}>
                  {comments.length} comment{comments.length !== 1 ? "s" : ""}
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
                    <span style={{ fontWeight: 600 }}>Add a comment</span>
                    <textarea
                      value={draftValue}
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({ ...prev, [status._id]: event.target.value }))
                      }
                      rows={3}
                      placeholder="Share your thoughts..."
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
                    {commentPending[status._id] ? "Posting..." : "Comment"}
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


