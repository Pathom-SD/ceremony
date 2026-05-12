"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { SessionPayload } from "@/lib/session-types";
import type { StoredFileRecord } from "@/lib/file-types";
import { ceremonyDepartments, lessonLearnedTopic } from "@/lib/ceremony-topics";
import { SessionHeader } from "./session-header";
import { DepartmentCard } from "./department-card";
import { LessonLearnedCard } from "./lesson-learned-card";
import { TopicModal } from "./topic-modal";
import { FilePreviewOverlay } from "./file-preview-overlay";
import { ClearAllControl } from "./clear-all-control";

type ModalState =
  | { open: false }
  | {
      open: true;
      topicId: string;
      topicLabel: string;
      departmentName?: string;
    };

type PreviewState =
  | { open: false }
  | { open: true; file: StoredFileRecord };

type Props = {
  initialSession: SessionPayload;
  initialFilesByTopic: Record<string, StoredFileRecord[]>;
};

function formatDisplayDate(date: string) {
  if (!date) return "ยังไม่เลือกวัน";
  const [year, month, day] = date.split("-");
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const monthName = thaiMonths[Number(month) - 1];
  if (!year || !monthName || !day) return date;
  return `${day} ${monthName} ${Number(year) + 543}`;
}

export function CeremonyApp({ initialSession, initialFilesByTopic }: Props) {
  const [session, setSession] = useState<SessionPayload>(initialSession);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [preview, setPreview] = useState<PreviewState>({ open: false });
  const [filesByTopic, setFilesByTopic] = useState<Record<string, StoredFileRecord[]>>(
    initialFilesByTopic,
  );

  const fetchSession = useCallback(async () => {
    const res = await fetch("/api/session", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as SessionPayload;
    setSession(data);
  }, []);

  const fetchFiles = useCallback(async (topicId: string) => {
    const res = await fetch(`/api/topics/${topicId}/files`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { files: StoredFileRecord[] };
    setFilesByTopic((prev) => ({ ...prev, [topicId]: data.files }));
  }, []);

  useEffect(() => {
    const socket: Socket = io({
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    const onSessionUpdated = (payload: SessionPayload) => {
      setSession(payload);
    };

    const onSessionCleared = () => {
      setSession({
        projectName: "",
        projectNo: "",
        customer: "",
        ceremonyDate: "",
      });
      setFilesByTopic({});
      setModal({ open: false });
      setPreview({ open: false });
    };

    const onFilesChanged = (payload: { topicId: string }) => {
      void fetchFiles(payload.topicId);
    };

    socket.on("session:updated", onSessionUpdated);
    socket.on("session:cleared", onSessionCleared);
    socket.on("files:changed", onFilesChanged);

    return () => {
      socket.off("session:updated", onSessionUpdated);
      socket.off("session:cleared", onSessionCleared);
      socket.off("files:changed", onFilesChanged);
      socket.disconnect();
    };
  }, [fetchFiles]);

  const topicLookup = useMemo(() => {
    const map = new Map<
      string,
      { label: string; departmentName?: string }
    >();
    for (const d of ceremonyDepartments) {
      for (const t of d.topics) {
        map.set(t.id, { label: t.label, departmentName: d.name });
      }
    }
    map.set(lessonLearnedTopic.id, {
      label: lessonLearnedTopic.label,
      departmentName: undefined,
    });
    return map;
  }, []);

  const departmentById = useMemo(
    () => Object.fromEntries(ceremonyDepartments.map((d) => [d.id, d])),
    [],
  );

  const fileCountsByTopic = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filesByTopic).map(([topicId, files]) => [
          topicId,
          files.length,
        ]),
      ),
    [filesByTopic],
  );

  const openTopic = (topicId: string) => {
    const meta = topicLookup.get(topicId);
    if (!meta) return;
    setModal({
      open: true,
      topicId,
      topicLabel: meta.label,
      departmentName: meta.departmentName,
    });
    void fetchFiles(topicId);
  };

  return (
    <div className="h-dvh overflow-hidden bg-[var(--ceremony-bg)] text-[var(--ceremony-ink)]">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col gap-3 px-3 py-3">
        <header className="flex min-h-0 shrink-0 flex-col gap-3 rounded-[22px] border border-[var(--ceremony-border)] bg-[color-mix(in_oklab,var(--ceremony-surface)_94%,transparent)] p-3 shadow-[var(--ceremony-shadow)] xl:flex-row xl:items-stretch">
          <div className="flex min-w-[250px] items-center gap-3 rounded-[18px] bg-[var(--ceremony-surface-2)] px-3 py-2">
            <div className="grid size-12 place-items-center rounded-2xl bg-[var(--ceremony-primary)] text-sm font-black leading-none text-[var(--ceremony-primary-ink)]">
              AIT
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--ceremony-muted)]">
                Ceremony board
              </p>
              <h1 className="truncate text-xl font-black tracking-[-0.04em] sm:text-2xl">
                AIT - Ceremony Activity
              </h1>
              <p className="truncate text-xs font-medium text-[var(--ceremony-muted)]">
                ทุกหัวข้อแสดงครบในจอเดียว
              </p>
            </div>
          </div>

          <SessionHeader
            key={JSON.stringify(session)}
            session={session}
            onSaved={setSession}
          />

          <aside className="grid shrink-0 gap-2 sm:grid-cols-2 xl:w-[270px] xl:grid-cols-1">
            <div className="rounded-[18px] border border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ceremony-muted)]">
                Summary
              </p>
              <p className="mt-1 truncate text-sm font-extrabold">
                {session.projectName || "ยังไม่ได้ระบุโปรเจ็กต์"}
              </p>
              <p className="truncate text-xs text-[var(--ceremony-muted)]">
                {session.customer || "ยังไม่ได้ระบุลูกค้า"} ·{" "}
                {formatDisplayDate(session.ceremonyDate)}
              </p>
            </div>
            <ClearAllControl onCleared={() => void fetchSession()} />
          </aside>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-5 grid-rows-2 gap-2">
          <DepartmentCard
            department={departmentById.mk}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="col-span-1 row-span-1"
            topicsClassName="grid-cols-1 grid-rows-2"
          />
          <DepartmentCard
            department={departmentById.med}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="col-span-2 row-span-1"
            topicsClassName="grid-cols-2 grid-rows-2"
          />
          <DepartmentCard
            department={departmentById.mep}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="col-span-1 row-span-1"
            topicsClassName="grid-cols-1 grid-rows-3"
          />
          <DepartmentCard
            department={departmentById.ee}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="col-span-1 row-span-1"
            topicsClassName="grid-cols-1 grid-rows-1"
          />
          <DepartmentCard
            department={departmentById.qc}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="col-span-1 row-span-1"
            topicsClassName="grid-cols-1 grid-rows-1"
          />
          <DepartmentCard
            department={departmentById.pe}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="col-span-3 row-span-1"
            topicsClassName="grid-cols-3 grid-rows-1"
          />
          <LessonLearnedCard
            className="col-span-1 row-span-1"
            hasFiles={(fileCountsByTopic[lessonLearnedTopic.id] ?? 0) > 0}
            onOpen={() => openTopic(lessonLearnedTopic.id)}
          />
        </main>

        {modal.open ? (
          <TopicModal
            topicId={modal.topicId}
            topicLabel={modal.topicLabel}
            departmentName={modal.departmentName}
            files={filesByTopic[modal.topicId] ?? []}
            onClose={() => setModal({ open: false })}
            onFilesUpdated={() => void fetchFiles(modal.topicId)}
            onPreview={(file) => setPreview({ open: true, file })}
          />
        ) : null}

        {preview.open ? (
          <FilePreviewOverlay
            file={preview.file}
            onClose={() => setPreview({ open: false })}
          />
        ) : null}
      </div>
    </div>
  );
}
