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
    const sessionSnapshot = await adminDb.ref(`boofor/sessions/${sessionId}`).once("value");
    if (!sessionSnapshot.exists()) {
      return NextResponse.json({ error: "Phiên làm việc đã hết hạn hoặc không hợp lệ" }, { status: 401 });
    }

    // 3. Query all users
    const usersSnapshot = await adminDb.ref("boofor/users").once("value");
    const usersData = usersSnapshot.val() || {};

    const usernames: string[] = [];
    for (const username in usersData) {
      usernames.push(username);
    }

    // Sort alphabetically
    usernames.sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      users: usernames,
    });
  } catch (error) {
    console.error("Get Users Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi tải danh sách người dùng" }, { status: 500 });
  }
}
