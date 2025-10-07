import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl } from "@/lib/config";

interface LikePayload {
  statusId?: string;
  action?: "like" | "unlike";
}

async function forwardLike({
  endpoint,
  method,
  authorization,
  apiKey,
  body,
}: {
  endpoint: string;
  method: "POST" | "DELETE";
  authorization: string;
  apiKey: string;
  body: string;
}) {
  return fetch(buildApiUrl(endpoint), {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authorization,
      "x-api-key": apiKey,
    },
    body,
  });
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-cis-api-key") ?? process.env.CIS_API_KEY;

  if (!apiKey) {
    console.error("classroom/like failed", "missing API key configuration");
    return NextResponse.json(
      { message: "CIS_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ message: "Authentication token is missing" }, { status: 401 });
  }

  let payload: LikePayload | undefined;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("classroom/like failed", "invalid JSON body", error);
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const statusId = payload?.statusId;
  if (!statusId || typeof statusId !== "string") {
    return NextResponse.json({ message: "statusId is required" }, { status: 400 });
  }

  const action = payload?.action === "unlike" ? "unlike" : "like";
  const forwardedBody = JSON.stringify({ statusId });

  try {
    let upstreamResponse = await forwardLike({
      endpoint: "/like",
      method: action === "unlike" ? "DELETE" : "POST",
      authorization,
      apiKey,
      body: forwardedBody,
    });

    if (action === "unlike" && (upstreamResponse.status === 404 || upstreamResponse.status === 405)) {
      upstreamResponse = await forwardLike({
        endpoint: "/unlike",
        method: "POST",
        authorization,
        apiKey,
        body: forwardedBody,
      });
    }

    const rawBody = await upstreamResponse.text();
    let parsedBody: unknown = rawBody;

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    if (!upstreamResponse.ok) {
      console.error("classroom/like failed", upstreamResponse.status, parsedBody);
      return NextResponse.json(
        typeof parsedBody === "string" ? { message: parsedBody } : parsedBody,
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(parsedBody, { status: upstreamResponse.status });
  } catch (error) {
    console.error("Failed to reach like service", error);
    return NextResponse.json(
      { message: "Unable to reach like service" },
      { status: 502 },
    );
  }
}
