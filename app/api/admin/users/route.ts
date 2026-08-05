import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebaseAdmin";
import { cookies } from "next/headers";

// Helper function to check if the requester is an admin
async function verifyAdmin(req: Request): Promise<{ isAdmin: boolean; requesterUsername?: string }> {
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

    if (!sessionId) {
      return { isAdmin: false };
    }

    const sessionSnapshot = await adminDb.ref(`boofor/sessions/${sessionId}`).once("value");
    if (!sessionSnapshot.exists()) {
      return { isAdmin: false };
    }

    const session = sessionSnapshot.val();

    // Verify user role directly from database to avoid stale roles in sessions
    const userSnapshot = await adminDb.ref(`boofor/users/${session.username}`).once("value");
    if (!userSnapshot.exists()) {
      return { isAdmin: false };
    }

    const user = userSnapshot.val();
    return {
      isAdmin: user.role === "admin",
      requesterUsername: user.username,
    };
  } catch (error) {
    console.error("Admin verification error:", error);
    return { isAdmin: false };
  }
}

// 1. GET: Fetch all users and online status count
export async function GET(req: Request) {
  const { isAdmin, requesterUsername } = await verifyAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Bạn không có quyền truy cập chức năng này" }, { status: 403 });
  }

  try {
    // Fetch all users
    const usersSnapshot = await adminDb.ref("boofor/users").once("value");
    const usersData = usersSnapshot.val() || {};

    // Fetch all active sessions to determine who is online
    const sessionsSnapshot = await adminDb.ref("boofor/sessions").once("value");
    const sessionsData = sessionsSnapshot.val() || {};

    const onlineUsernames = new Set<string>();
    for (const key in sessionsData) {
      const session = sessionsData[key];
      if (session && session.username) {
        onlineUsernames.add(session.username);
      }
    }

    const userList = [];
    for (const username in usersData) {
      const user = usersData[username];
      userList.push({
        username: user.username,
        role: user.role,
        createdAt: user.createdAt || "",
        isOnline: onlineUsernames.has(user.username),
        isCurrent: user.username === requesterUsername,
      });
    }

    // Sort users by username
    userList.sort((a, b) => a.username.localeCompare(b.username));

    return NextResponse.json({
      success: true,
      users: userList,
      onlineCount: onlineUsernames.size,
    });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    return NextResponse.json({ error: "Không thể tải danh sách tài khoản" }, { status: 500 });
  }
}

// 2. PUT: Update user role
export async function PUT(req: Request) {
  const { isAdmin, requesterUsername } = await verifyAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Bạn không có quyền truy cập chức năng này" }, { status: 403 });
  }

  try {
    const { targetUsername, newRole } = await req.json();

    if (!targetUsername || !newRole) {
      return NextResponse.json({ error: "Thiếu thông tin người dùng hoặc vai trò" }, { status: 400 });
    }

    if (!["admin", "user", "guest"].includes(newRole)) {
      return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 });
    }

    const userRef = adminDb.ref(`boofor/users/${targetUsername}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Người dùng không tồn tại" }, { status: 404 });
    }

    const targetUser = snapshot.val();

    // CRITICAL: Only super admin 'liam' can change admin roles or promote users to admin or modify 'liam' itself
    if ((targetUser.role === "admin" || targetUsername === "liam" || newRole === "admin") && requesterUsername !== "liam") {
      return NextResponse.json({ error: "Chỉ Super Admin (liam) mới có quyền tạo hoặc thay đổi tài khoản admin" }, { status: 403 });
    }

    // Update role
    await userRef.update({ role: newRole });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update User Error:", error);
    return NextResponse.json({ error: "Không thể cập nhật quyền người dùng" }, { status: 500 });
  }
}

// 3. DELETE: Remove user account
export async function DELETE(req: Request) {
  const { isAdmin, requesterUsername } = await verifyAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Bạn không có quyền truy cập chức năng này" }, { status: 403 });
  }

  try {
    const { targetUsername } = await req.json();

    if (!targetUsername) {
      return NextResponse.json({ error: "Thiếu tên đăng nhập người dùng cần xóa" }, { status: 400 });
    }

    const userRef = adminDb.ref(`boofor/users/${targetUsername}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Người dùng không tồn tại" }, { status: 404 });
    }

    const targetUser = snapshot.val();

    // CRITICAL: Only super admin 'liam' can delete admin accounts or delete 'liam' itself
    if ((targetUser.role === "admin" || targetUsername === "liam") && requesterUsername !== "liam") {
      return NextResponse.json({ error: "Chỉ Super Admin (liam) mới có quyền xóa tài khoản admin" }, { status: 403 });
    }

    // Delete user
    await userRef.remove();

    // Delete any active sessions for this deleted user
    const sessionsSnapshot = await adminDb.ref("boofor/sessions").once("value");
    const sessions = sessionsSnapshot.val() || {};
    for (const key in sessions) {
      if (sessions[key]?.username === targetUsername) {
        await adminDb.ref(`boofor/sessions/${key}`).remove();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete User Error:", error);
    return NextResponse.json({ error: "Không thể xóa người dùng" }, { status: 500 });
  }
}
