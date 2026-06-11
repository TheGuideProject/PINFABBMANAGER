import { NextResponse, type NextRequest } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/server/auth";
import { canAccessProject } from "@/server/access";
import { prisma } from "@/server/db";
import { storage } from "@/server/services/storage";
import type { PhotoCategory } from "@/generated/prisma/enums";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const CATEGORIES: PhotoCategory[] = [
  "FIN_CONDITION",
  "HULL_OPENING",
  "SEAL",
  "ACTUATOR",
  "HYDRAULICS",
  "DAMAGE",
  "GENERAL",
  "DOCUMENT",
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const projectId = String(formData.get("projectId") ?? "");
  const dailyLogId = formData.get("dailyLogId")
    ? String(formData.get("dailyLogId"))
    : null;
  const category = String(formData.get("category") ?? "GENERAL") as PhotoCategory;
  const caption = formData.get("caption") ? String(formData.get("caption")) : null;

  if (!(file instanceof File) || !projectId) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "invalidFile" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (!(await canAccessProject(session, projectId))) {
    return new NextResponse(null, { status: 403 });
  }

  if (dailyLogId) {
    const log = await prisma.dailyLog.findUnique({ where: { id: dailyLogId } });
    if (!log || log.projectId !== projectId) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `projects/${projectId}/photos/${createId()}.${extension}`;
  await storage.put(key, Buffer.from(await file.arrayBuffer()), file.type);

  const photo = await prisma.photo.create({
    data: {
      projectId,
      dailyLogId,
      category,
      caption,
      storageKey: key,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({ id: photo.id, storageKey: key });
}
