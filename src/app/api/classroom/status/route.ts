import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl } from "@/lib/config";

async function forwardRequest(
  request: NextRequest,
  init?: RequestInit,
) {
  const apiKey = process.env.CIS_API_KEY;

  if (!apiKey) {
    console.error("classroom/status failed", "missing API key configuration");
    return NextResponse.json(
      { message: "CIS_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return NextResponse.json({ message: "Authentication token is missing" }, { status: 401 });
  }

  try {
    const upstreamResponse = await fetch(buildApiUrl("/status"), {
      method: request.method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authorization,
        "x-api-key": apiKey,
      },
      ...init,
    });

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
      console.error("classroom/status failed", upstreamResponse.status, parsedBody);
      return NextResponse.json(
        typeof parsedBody === "string" ? { message: parsedBody } : parsedBody,
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(parsedBody, { status: upstreamResponse.status });
  } catch (error) {
    console.error("Failed to reach status service", error);
    return NextResponse.json(
      { message: "Unable to reach status service" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return forwardRequest(request);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return forwardRequest(request, { body });
}
