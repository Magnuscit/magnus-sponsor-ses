import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: Request) {
  try {
    const { userId, password } = await request.json();

    if (userId === ADMIN_ID && password === ADMIN_PASSWORD) {
      const token = sign({ userId }, JWT_SECRET, { expiresIn: "1h" });

      // @ts-ignore
      (await cookies()).set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600,
      });

      return NextResponse.json({
        success: true,
        message: "Login successful",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid credentials",
      },
      { status: 401 },
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred during login",
      },
      { status: 500 },
    );
  }
}
