import { NextResponse } from "next/server";
import { isValidTopicId } from "@/lib/ceremony-topics";
import { emitCeremony } from "@/lib/io-registry";
import {
  deleteFileRecord,
  getFileRecord,
  updateFileOriginalName,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ topicId: string; fileId: string }> };

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const { topicId, fileId } = await ctx.params;
  if (!isValidTopicId(topicId)) {
    return NextResponse.json({ error: "UNKNOWN_TOPIC" }, { status: 404 });
  }
  const rec = await getFileRecord(fileId);
  if (!rec || rec.topicId !== topicId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  await deleteFileRecord(fileId);
  emitCeremony("files:changed", { topicId });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const { topicId, fileId } = await ctx.params;
  if (!isValidTopicId(topicId)) {
    return NextResponse.json({ error: "UNKNOWN_TOPIC" }, { status: 404 });
  }
  const rec = await getFileRecord(fileId);
  if (!rec || rec.topicId !== topicId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("originalName" in body)) {
    return NextResponse.json({ error: "ORIGINAL_NAME_REQUIRED" }, { status: 400 });
  }
  const originalName = (body as { originalName?: unknown }).originalName;
  if (typeof originalName !== "string" || !originalName.trim()) {
    return NextResponse.json({ error: "ORIGINAL_NAME_REQUIRED" }, { status: 400 });
  }

  const updated = await updateFileOriginalName(fileId, originalName.trim());
  if (!updated) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  emitCeremony("files:changed", { topicId });
  return NextResponse.json({ file: updated });
}
