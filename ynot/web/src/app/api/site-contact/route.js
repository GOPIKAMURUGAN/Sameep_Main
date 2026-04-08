import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://newsameep-backend.go-kar.net";

export async function GET() {
  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/app-config/public-site-contact`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { message: "Failed to fetch public site contact" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      addressLine1: data?.addressLine1 || "",
      addressLine2: data?.addressLine2 || "",
      phone: data?.phone || "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Public site contact proxy request failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
