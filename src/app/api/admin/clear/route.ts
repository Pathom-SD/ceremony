import { NextResponse } from "next/server";
import { emitCeremony } from "@/lib/io-registry";
import { clearAllStorage } from "@/lib/storage";
import { defaultSession } from "@/lib/session-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CEREMONY_CLEAR_SECRET;
  if (secret) {
    const auth = request.headers.get("x-ceremony-clear-secret");
    if (auth !== secret) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  await clearAllStorage();
  emitCeremony("session:cleared", {});
  emitCeremony("session:updated", { ...defaultSession });
  return NextResponse.json({ ok: true });
}
