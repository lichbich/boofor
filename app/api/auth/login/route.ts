import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const sanitizedUsername = username.trim().toLowerCase();

    // Query database for the user
    const userRef = adminDb.ref(`boofor/users/${sanitizedUsername}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác" },
        { status: 400 }
      );
    }

    const user = snapshot.val();
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    if (user.password !== hashedPassword) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không chính xác" },
        { status: 400 }
      );
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const sessionRef = adminDb.ref(`boofor/sessions/${sessionId}`);

    const sessionData = {
      username: user.username,
      role: user.role,
      createdAt: new Date().toISOString(),
    };

    await sessionRef.set(sessionData);

    // Prepare response
    const response = NextResponse.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
        theme: user.theme || "light",
      },
      sessionId,
    });

    // Set HTTP-only cookie
    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra trong quá trình đăng nhập" }, { status: 500 });
  }
}
