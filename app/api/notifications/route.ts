import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebaseAdmin";
import { cookies } from "next/headers";

// Helper to get authenticated username from session
async function getAuthenticatedUser(req: Request): Promise<string | null> {
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

    if (!sessionId) return null;

    const sessionSnapshot = await adminDb.ref(`boofor/sessions/${sessionId}`).once("value");
    if (!sessionSnapshot.exists()) return null;

    const session = sessionSnapshot.val();
    return session.username || null;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

// 1. GET: Fetch notifications for the authenticated user
export async function GET(req: Request) {
  try {
    const username = await getAuthenticatedUser(req);
    if (!username) {
      return NextResponse.json({ error: "Chưa đăng nhập hoặc phiên làm việc hết hạn" }, { status: 401 });
    }

    const notificationsSnapshot = await adminDb.ref(`boofor/notifications/${username}`).once("value");
    const notificationsData = notificationsSnapshot.val() || {};

    const notificationsList = [];
    for (const key in notificationsData) {
      notificationsList.push(notificationsData[key]);
    }

    // Sort by createdAt (newest first)
    notificationsList.sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      notifications: notificationsList,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi tải danh sách thông báo" }, { status: 500 });
  }
}

// 2. DELETE: Remove a notification
export async function DELETE(req: Request) {
  try {
    const username = await getAuthenticatedUser(req);
    if (!username) {
      return NextResponse.json({ error: "Chưa đăng nhập hoặc phiên làm việc hết hạn" }, { status: 401 });
    }

    const { notificationId } = await req.json();
    if (!notificationId) {
      return NextResponse.json({ error: "Thiếu ID thông báo" }, { status: 400 });
    }

    const notificationRef = adminDb.ref(`boofor/notifications/${username}/${notificationId}`);
    const snapshot = await notificationRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Thông báo không tồn tại hoặc đã bị xóa" }, { status: 404 });
    }

    await notificationRef.remove();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi xóa thông báo" }, { status: 500 });
  }
}
