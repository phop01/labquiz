import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl } from "@/lib/config";

export async function GET(request: NextRequest) {
  const apiKey = process.env.CIS_API_KEY;

  if (!apiKey) {
    console.error("classroom/profile failed", "missing API key configuration");
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
    const upstreamResponse = await fetch(buildApiUrl("/profile"), {
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        "x-api-key": apiKey,
      },
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
      console.error("classroom/profile failed", upstreamResponse.status, parsedBody);
      return NextResponse.json(
        typeof parsedBody === "string" ? { message: parsedBody } : parsedBody,
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(parsedBody, { status: upstreamResponse.status });
  } catch (error) {
    console.error("Failed to reach profile service", error);
    return NextResponse.json(
      { message: "Unable to reach profile service" },
      { status: 502 },
    );
  }
}

