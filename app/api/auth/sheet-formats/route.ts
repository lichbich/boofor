import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebaseAdmin";
import { cookies } from "next/headers";

async function getSessionUser(req: Request) {
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
    return null;
  }

  const sessionSnapshot = await adminDb.ref(`boofor/sessions/${sessionId}`).once("value");
  if (!sessionSnapshot.exists()) {
    return null;
  }

  const session = sessionSnapshot.val();
  return session.username;
}

export async function GET(req: Request) {
  try {
    const username = await getSessionUser(req);
    if (!username) {
      return NextResponse.json({ error: "Không tìm thấy phiên làm việc hoặc chưa đăng nhập" }, { status: 401 });
    }

    const userSnapshot = await adminDb.ref(`boofor/users/${username}`).once("value");
    if (!userSnapshot.exists()) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    const user = userSnapshot.val();
    return NextResponse.json({
      success: true,
      sheetFormats: user.sheetFormats || [],
      selectedSheetFormatId: user.selectedSheetFormatId || "default",
    });
  } catch (error) {
    console.error("GET Sheet Formats Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi lấy danh sách cấu hình sheet" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const username = await getSessionUser(req);
    if (!username) {
      return NextResponse.json({ error: "Không tìm thấy phiên làm việc hoặc chưa đăng nhập" }, { status: 401 });
    }

    const { sheetFormats, selectedSheetFormatId } = await req.json();

    const userRef = adminDb.ref(`boofor/users/${username}`);
    await userRef.update({
      sheetFormats: sheetFormats || [],
      selectedSheetFormatId: selectedSheetFormatId || "default",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT Sheet Formats Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi cập nhật cấu hình sheet" }, { status: 500 });
  }
}
