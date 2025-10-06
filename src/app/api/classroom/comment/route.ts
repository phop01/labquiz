import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl } from "@/lib/config";

export async function POST(request: NextRequest) {
  const apiKey = process.env.CIS_API_KEY;

  if (!apiKey) {
    console.error("classroom/comment failed", "missing API key configuration");
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
    const upstreamResponse = await fetch(buildApiUrl("/comment"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authorization,
        "x-api-key": apiKey,
      },
      body: await request.text(),
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
      console.error("classroom/comment failed", upstreamResponse.status, parsedBody);
      return NextResponse.json(
        typeof parsedBody === "string" ? { message: parsedBody } : parsedBody,
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(parsedBody, { status: upstreamResponse.status });
  } catch (error) {
    console.error("Failed to reach comment service", error);
    return NextResponse.json(
      { message: "Unable to reach comment service" },
      { status: 502 },
    );
  }
}
