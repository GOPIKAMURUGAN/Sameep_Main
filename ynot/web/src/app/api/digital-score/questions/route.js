import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://newsameep-backend.go-kar.net";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const target = `${BACKEND_BASE_URL}/api/digital-score/questions${
      query ? `?${query}` : ""
    }`;

    const res = await fetch(target, {
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Digital score questions proxy request failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
