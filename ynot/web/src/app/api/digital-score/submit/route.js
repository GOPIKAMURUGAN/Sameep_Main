import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://newsameep-backend.go-kar.net";

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_BASE_URL}/api/digital-score/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Digital score submission proxy request failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
