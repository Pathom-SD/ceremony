import { NextResponse } from "next/server";
import { isValidTopicId } from "@/lib/ceremony-topics";
import { emitCeremony } from "@/lib/io-registry";
import { deleteFileRecord, getFileRecord } from "@/lib/storage";

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
