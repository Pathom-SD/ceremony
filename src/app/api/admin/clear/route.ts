import { NextResponse } from "next/server";
import { emitCeremony } from "@/lib/io-registry";
import { clearAllStorage } from "@/lib/storage";
import { defaultSession } from "@/lib/session-types";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAllStorage();
  emitCeremony("session:cleared", {});
  emitCeremony("session:updated", { ...defaultSession });
  return NextResponse.json({ ok: true });
}
