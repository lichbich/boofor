import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebaseAdmin";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    let sessionId = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      sessionId = authHeader.substring(7);
    }

    if (!sessionId) {
      const cookieStore = await cookies();
      sessionId = cookieStore.get("session_id")?.value || "";
    }

    if (sessionId) {
      // Remove from database
      await adminDb.ref(`boofor/sessions/${sessionId}`).remove();
    }

    const response = NextResponse.json({ success: true });

    // Clear cookie
    response.cookies.set("session_id", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi đăng xuất" }, { status: 500 });
  }
}
