import { NextResponse } from "next/server";
import { buildApiUrl } from "@/lib/config";

interface SignInPayload {
  email: string;
  password: string;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SignInPayload;
  const apiKey = process.env.CIS_API_KEY;

  if (!apiKey) {
    console.error("signin failed", "missing API key configuration");
    return NextResponse.json(
      { message: "CIS_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const upstreamResponse = await fetch(buildApiUrl("/signin"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await upstreamResponse.text();
    let parsedBody: unknown = rawBody;

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch (error) {
        parsedBody = rawBody;
      }
    }

    if (!upstreamResponse.ok) {
      console.error("signin failed", upstreamResponse.status, parsedBody);
      return NextResponse.json(
        typeof parsedBody === "string" ? { message: parsedBody } : parsedBody,
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(parsedBody, { status: upstreamResponse.status });
  } catch (error) {
    console.error("Failed to reach authentication service", error);
    return NextResponse.json(
      { message: "Unable to reach authentication service" },
      { status: 502 },
    );
  }
}

