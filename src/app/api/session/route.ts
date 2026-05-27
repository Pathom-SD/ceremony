import { NextResponse } from "next/server";
import { emitCeremony } from "@/lib/io-registry";
import { readSession, writeSession } from "@/lib/storage";
import type { SessionPayload } from "@/lib/session-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  return NextResponse.json(session);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<SessionPayload>;
    const current = await readSession();
    const next: SessionPayload = {
      projectName:
        typeof body.projectName === "string"
          ? body.projectName
          : current.projectName,
      projectNo:
        typeof body.projectNo === "string"
          ? body.projectNo
          : current.projectNo,
      customer:
        typeof body.customer === "string" ? body.customer : current.customer,
      ceremonyDate:
        typeof body.ceremonyDate === "string"
          ? body.ceremonyDate
          : current.ceremonyDate,
      summaryProject: {
        quality:
          typeof body.summaryProject?.quality === "string"
            ? body.summaryProject.quality
            : current.summaryProject.quality,
        price:
          typeof body.summaryProject?.price === "string"
            ? body.summaryProject.price
            : current.summaryProject.price,
        actual:
          typeof body.summaryProject?.actual === "string"
            ? body.summaryProject.actual
            : current.summaryProject.actual,
        delivery:
          typeof body.summaryProject?.delivery === "string"
            ? body.summaryProject.delivery
            : current.summaryProject.delivery,
      },
    };
    await writeSession(next);
    emitCeremony("session:updated", next);
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
}
