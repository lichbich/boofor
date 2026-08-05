import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebaseAdmin";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    // 1. Get session ID from header or cookie
    let sessionId = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      sessionId = authHeader.substring(7);
    }

    if (!sessionId) {
      const cookieStore = await cookies();
      sessionId = cookieStore.get("session_id")?.value || "";
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Không tìm thấy phiên làm việc" }, { status: 401 });
    }

    // 2. Query session from database
    const sessionRef = adminDb.ref(`boofor/sessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once("value");

    if (!sessionSnapshot.exists()) {
      return NextResponse.json({ error: "Phiên làm việc đã hết hạn hoặc không hợp lệ" }, { status: 401 });
    }

    const session = sessionSnapshot.val();

    // 3. Query current user to get their actual current role
    const userRef = adminDb.ref(`boofor/users/${session.username}`);
    const userSnapshot = await userRef.once("value");

    if (!userSnapshot.exists()) {
      // User was deleted
      await sessionRef.remove();
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 401 });
    }

    const user = userSnapshot.val();

    // 4. Return user profile (exclude password hash)
    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
        theme: user.theme || "light",
      },
    });
  } catch (error) {
    console.error("Session Check Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi xác thực phiên làm việc" }, { status: 500 });
  }
}
