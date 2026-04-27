import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://newsameep-backend.go-kar.net";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "8";

    const res = await fetch(
      `${BACKEND_BASE_URL}/api/dummy-vendors/trusted-partners?limit=${encodeURIComponent(limit)}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { message: "Failed to fetch trusted partners" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Trusted partners proxy request failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
