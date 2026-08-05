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

    // Validate username (only alphanumeric and underscore, 3-20 characters)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(sanitizedUsername)) {
      return NextResponse.json(
        { error: "Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới và có độ dài từ 3-20 ký tự" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải chứa ít nhất 6 ký tự" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const userRef = adminDb.ref(`boofor/users/${sanitizedUsername}`);
    const snapshot = await userRef.once("value");

    if (snapshot.exists()) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại trong hệ thống" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    // Save user with 'guest' role by default
    await userRef.set({
      username: sanitizedUsername,
      password: hashedPassword,
      role: "guest",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, username: sanitizedUsername });
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra trong quá trình đăng ký" }, { status: 500 });
  }
}
