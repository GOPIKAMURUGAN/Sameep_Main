import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://newsameep-backend.go-kar.net";

export async function GET() {
  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/dummy-vendors/categories/counts`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { message: "Failed to fetch categories" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Category proxy request failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
