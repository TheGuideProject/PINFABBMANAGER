import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { canAccessStorageKey } from "@/server/access";
import { storage } from "@/server/services/storage";
import { prisma } from "@/server/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });

  const { key: segments } = await params;
  const key = segments.join("/");
  if (key.includes("..")) return new NextResponse(null, { status: 400 });

  if (!(await canAccessStorageKey(session, key))) {
    return new NextResponse(null, { status: 403 });
  }

  if (process.env.STORAGE_DRIVER === "r2") {
    return NextResponse.redirect(await storage.getDownloadUrl(key));
  }

  // Local driver: stream through the app.
  try {
    const stream = await storage.getStream(key);
    const photo = await prisma.photo.findUnique({
      where: { storageKey: key },
      select: { mimeType: true },
    });
    return new NextResponse(stream, {
      headers: {
        "Content-Type": photo?.mimeType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

/** Local-driver counterpart of a presigned PUT (large audio uploads). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });

  const { key: segments } = await params;
  const key = segments.join("/");
  if (key.includes("..")) return new NextResponse(null, { status: 400 });

  if (!(await canAccessStorageKey(session, key))) {
    return new NextResponse(null, { status: 403 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  const mimeType = request.headers.get("content-type") ?? "application/octet-stream";
  await storage.put(key, body, mimeType);
  return NextResponse.json({ ok: true });
}
