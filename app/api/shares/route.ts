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

// 1. POST: Share an author with another user
export async function POST(req: Request) {
  try {
    const sender = await getAuthenticatedUser(req);
    if (!sender) {
      return NextResponse.json({ error: "Chưa đăng nhập hoặc phiên làm việc hết hạn" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientUsername } = body;

    if (!recipientUsername) {
      return NextResponse.json({ error: "Thiếu thông tin người nhận" }, { status: 400 });
    }

    // Verify recipient exists
    const recipientSnapshot = await adminDb.ref(`boofor/users/${recipientUsername}`).once("value");
    if (!recipientSnapshot.exists()) {
      return NextResponse.json({ error: "Người nhận không tồn tại trên hệ thống" }, { status: 404 });
    }

    if (recipientUsername === sender) {
      return NextResponse.json({ error: "Không thể tự chia sẻ tác giả cho chính mình" }, { status: 400 });
    }

    let authorsToShare: any[] = [];
    if (body.authors && Array.isArray(body.authors)) {
      authorsToShare = body.authors;
    } else {
      if (!body.authorName) {
        return NextResponse.json({ error: "Thiếu tên tác giả" }, { status: 400 });
      }
      authorsToShare = [{
        authorName: body.authorName,
        bookListText: body.bookListText || "",
        bookIntroMap: body.bookIntroMap || {},
        genresText: body.genresText || "",
        chapterKeywords: body.chapterKeywords || "",
        customBlockPhrases: body.customBlockPhrases || "",
      }];
    }

    if (authorsToShare.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy tác giả nào để chia sẻ" }, { status: 400 });
    }

    const recipientSharesRef = adminDb.ref(`boofor/shares/${recipientUsername}`);
    const nowStr = new Date().toISOString();

    const sharePromises = authorsToShare.map(async (author: any) => {
      const newShareRef = recipientSharesRef.push();
      const shareId = newShareRef.key;
      
      const setSharePromise = newShareRef.set({
        id: shareId,
        sender,
        authorName: author.authorName,
        bookListText: author.bookListText || "",
        bookIntroMap: author.bookIntroMap || {},
        genresText: author.genresText || "",
        chapterKeywords: author.chapterKeywords || "chapter, lesson",
        customBlockPhrases: author.customBlockPhrases || "",
        sharedAt: nowStr,
      });

      const setSentPromise = adminDb.ref(`boofor/sent_shares/${sender}/${shareId}`).set({
        id: shareId,
        recipient: recipientUsername,
        authorName: author.authorName,
        status: "pending",
        sharedAt: nowStr,
        bookListText: author.bookListText || "",
        bookIntroMap: author.bookIntroMap || {},
        genresText: author.genresText || "",
        chapterKeywords: author.chapterKeywords || "chapter, lesson",
        customBlockPhrases: author.customBlockPhrases || "",
      });

      await Promise.all([setSharePromise, setSentPromise]);
      return shareId;
    });

    const shareIds = await Promise.all(sharePromises);

    return NextResponse.json({ success: true, shareId: shareIds[0], shareIds });
  } catch (error) {
    console.error("Share Author Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi chia sẻ tác giả" }, { status: 500 });
  }
}

// 2. GET: List all pending shares and sent shares history for the authenticated user
export async function GET(req: Request) {
  try {
    const username = await getAuthenticatedUser(req);
    if (!username) {
      return NextResponse.json({ error: "Chưa đăng nhập hoặc phiên làm việc hết hạn" }, { status: 401 });
    }

    const sharesSnapshot = await adminDb.ref(`boofor/shares/${username}`).once("value");
    const sharesData = sharesSnapshot.val() || {};

    const sharesList = [];
    for (const key in sharesData) {
      sharesList.push(sharesData[key]);
    }

    // Sort by sharedAt (newest first)
    sharesList.sort((a: any, b: any) => {
      return new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime();
    });

    // Fetch sent shares history
    const sentSnapshot = await adminDb.ref(`boofor/sent_shares/${username}`).once("value");
    const sentData = sentSnapshot.val() || {};

    const sentList = [];
    for (const key in sentData) {
      const item = sentData[key];
      if (!item.bookListText && item.status === "pending" && item.recipient) {
        try {
          const detailSnapshot = await adminDb.ref(`boofor/shares/${item.recipient}/${item.id}`).once("value");
          if (detailSnapshot.exists()) {
            const detail = detailSnapshot.val();
            item.bookListText = detail.bookListText || "";
            item.bookIntroMap = detail.bookIntroMap || {};
            item.genresText = detail.genresText || "";
            item.chapterKeywords = detail.chapterKeywords || "";
            item.customBlockPhrases = detail.customBlockPhrases || "";
          }
        } catch (err) {
          console.error("Failed to fetch pending share details for fallback:", err);
        }
      }
      sentList.push(item);
    }

    // Sort by sharedAt (newest first)
    sentList.sort((a: any, b: any) => {
      return new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime();
    });

    return NextResponse.json({
      success: true,
      shares: sharesList,
      sentShares: sentList,
    });
  } catch (error) {
    console.error("Get Shares Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi tải danh sách chia sẻ" }, { status: 500 });
  }
}

// 3. DELETE: Remove/Decline/Imported a share record
export async function DELETE(req: Request) {
  try {
    const username = await getAuthenticatedUser(req);
    if (!username) {
      return NextResponse.json({ error: "Chưa đăng nhập hoặc phiên làm việc hết hạn" }, { status: 401 });
    }

    const { shareId, status } = await req.json();
    if (!shareId) {
      return NextResponse.json({ error: "Thiếu ID bản ghi chia sẻ" }, { status: 400 });
    }

    const shareRef = adminDb.ref(`boofor/shares/${username}/${shareId}`);
    const snapshot = await shareRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Bản ghi chia sẻ không tồn tại hoặc đã bị xóa" }, { status: 404 });
    }

    const share = snapshot.val();
    await shareRef.remove();

    // Update status in sender's sent_shares node if it exists
    if (share.sender) {
      const sentShareRef = adminDb.ref(`boofor/sent_shares/${share.sender}/${shareId}`);
      const sentSnapshot = await sentShareRef.once("value");
      if (sentSnapshot.exists()) {
        await sentShareRef.update({
          status: status === "accept" ? "accepted" : status === "decline" ? "declined" : "removed",
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Send a status notification back to the sender if they shared it
    if (share.sender && (status === "accept" || status === "decline")) {
      const notificationRef = adminDb.ref(`boofor/notifications/${share.sender}`);
      const newNotifRef = notificationRef.push();
      await newNotifRef.set({
        id: newNotifRef.key,
        type: status,
        recipient: username,
        authorName: share.authorName,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Share Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi xử lý xóa chia sẻ" }, { status: 500 });
  }
}
