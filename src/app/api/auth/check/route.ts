import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET() {
  try {
    // @ts-ignore
    const token = (await cookies()).get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No token found",
        },
        { status: 401 },
      );
    }

    verify(token, JWT_SECRET);

    return NextResponse.json({
      success: true,
      message: "Valid token",
    });
  } catch (_) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid token",
      },
      { status: 401 },
    );
  }
}
