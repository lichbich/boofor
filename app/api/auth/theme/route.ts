import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebaseAdmin";
import { cookies } from "next/headers";

export async function PUT(req: Request) {
  try {
    const { theme } = await req.json();

    if (!theme || !["light", "dark"].includes(theme)) {
      return NextResponse.json({ error: "Chế độ giao diện không hợp lệ" }, { status: 400 });
    }

    // Get session ID from header or cookie
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

    // Query session
    const sessionSnapshot = await adminDb.ref(`boofor/sessions/${sessionId}`).once("value");
    if (!sessionSnapshot.exists()) {
      return NextResponse.json({ error: "Phiên làm việc đã hết hạn hoặc không hợp lệ" }, { status: 401 });
    }

    const session = sessionSnapshot.val();

    // Update user theme in database
    const userRef = adminDb.ref(`boofor/users/${session.username}`);
    await userRef.update({ theme });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Theme Update Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi cập nhật chế độ giao diện" }, { status: 500 });
  }
}
