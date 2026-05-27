"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { io, type Socket } from "socket.io-client";
import type { SessionPayload } from "@/lib/session-types";
import type { StoredFileRecord } from "@/lib/file-types";
import { ceremonyDepartments, ceremonyVideosTopic, lessonLearnedTopic } from "@/lib/ceremony-topics";
import { SessionHeader } from "./session-header";
import { DepartmentCard } from "./department-card";
import { LessonLearnedCard } from "./lesson-learned-card";
import { TopicModal } from "./topic-modal";
import { FilePreviewOverlay } from "./file-preview-overlay";
import { VideoLibraryMini } from "./video-library-mini";
import { ClearAllControl } from "./clear-all-control";
import { SummaryProjectCard } from "./summary-project-card";
import { PreferenceControls, useAppPreferences } from "./app-preferences";

type ModalState =
  | { open: false }
  | {
      open: true;
      topicId: string;
      topicLabel: string;
      departmentName?: string;
    };

type PreviewState = { open: false } | { open: true; file: StoredFileRecord };

type Props = {
  initialSession: SessionPayload;
  initialFilesByTopic: Record<string, StoredFileRecord[]>;
};

export function CeremonyApp({ initialSession, initialFilesByTopic }: Props) {
  const { t } = useAppPreferences();
  const [session, setSession] = useState<SessionPayload>(initialSession);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [preview, setPreview] = useState<PreviewState>({ open: false });
  const [filesByTopic, setFilesByTopic] = useState<Record<string, StoredFileRecord[]>>(initialFilesByTopic);

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
        summaryProject: {
          quality: "",
          price: "",
          actual: "",
          delivery: "",
        },
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
    const map = new Map<string, { label: string; departmentName?: string }>();
    for (const d of ceremonyDepartments) {
      for (const t of d.topics) {
        map.set(t.id, { label: t.label, departmentName: d.name });
      }
    }
    map.set(lessonLearnedTopic.id, {
      label: lessonLearnedTopic.label,
      departmentName: undefined,
    });
    map.set(ceremonyVideosTopic.id, {
      label: ceremonyVideosTopic.label,
      departmentName: undefined,
    });
    return map;
  }, []);

  const departmentById = useMemo(() => Object.fromEntries(ceremonyDepartments.map((d) => [d.id, d])), []);

  const fileCountsByTopic = useMemo(
    () => Object.fromEntries(Object.entries(filesByTopic).map(([topicId, files]) => [topicId, files.length])),
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
    <div
      data-ceremony-shell
      className="h-dvh overflow-y-auto overscroll-y-contain bg-background text-foreground xl:overflow-hidden"
    >
      <div className="mx-auto flex min-h-full max-w-[1800px] flex-col gap-3 px-3 py-3 sm:px-4 xl:h-full xl:min-h-0">
        <header
          data-ceremony-header
          className="flex min-h-0 shrink-0 flex-col gap-3 rounded-[22px] border border-(--ceremony-border) bg-[color-mix(in_oklab,var(--ceremony-surface)_94%,transparent)] p-3 shadow-(--ceremony-shadow) xl:flex-row xl:items-stretch"
        >
          <div className="flex w-full min-w-0 items-center gap-3 rounded-[18px] bg-(--ceremony-surface-2) px-3 py-2 xl:min-w-[250px] xl:w-auto">
            <Image src="/logo.jpg" alt="AIT" width={60} height={60} className="rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-(--ceremony-muted)">
                {t("ceremonyBoard")}
              </p>
              <h1 className="truncate text-xl font-black tracking-[-0.04em] sm:text-2xl">Ceremony Activity</h1>
              <PreferenceControls />
            </div>
          </div>

          <SessionHeader
            key={JSON.stringify(session)}
            session={session}
            onSaved={setSession}
            clearSlot={<ClearAllControl triggerVariant="toolbar" onCleared={() => void fetchSession()} />}
          />

          <aside className="grid w-full min-w-0 shrink-0 gap-2 sm:grid-cols-2 xl:w-[270px] xl:grid-cols-1">
            <SummaryProjectCard summary={session.summaryProject} onSaved={setSession} />
          </aside>
        </header>

        <main
          data-ceremony-board
          className="grid flex-1 auto-rows-min grid-cols-1 gap-2 pb-1 xl:min-h-0 xl:grid-cols-5 xl:grid-rows-2 xl:overflow-hidden xl:pb-0"
        >
          <DepartmentCard
            department={departmentById.mk}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="min-h-[200px] xl:col-span-1 xl:row-span-1 xl:min-h-0"
            topicsClassName="grid-cols-2 grid-rows-1 xl:grid-cols-1 xl:grid-rows-2"
          />
          <DepartmentCard
            department={departmentById.med}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="min-h-[220px] xl:col-span-2 xl:row-span-1 xl:min-h-0"
            topicsClassName="grid-cols-2 grid-rows-2"
          />
          <DepartmentCard
            department={departmentById.mep}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="min-h-[240px] xl:col-span-1 xl:row-span-1 xl:min-h-0"
            topicsClassName="grid-cols-1 grid-rows-3 sm:grid-cols-3 sm:grid-rows-1 xl:grid-cols-1 xl:grid-rows-3"
          />
          <DepartmentCard
            department={departmentById.ee}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="min-h-[120px] xl:col-span-1 xl:row-span-1 xl:min-h-0"
            topicsClassName="grid-cols-1 grid-rows-1"
          />
          <DepartmentCard
            department={departmentById.qc}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="min-h-[120px] xl:col-span-1 xl:row-span-1 xl:min-h-0"
            topicsClassName="grid-cols-1 grid-rows-1"
          />
          <DepartmentCard
            department={departmentById.pe}
            onOpenTopic={openTopic}
            fileCountsByTopic={fileCountsByTopic}
            className="min-h-[140px] xl:col-span-3 xl:row-span-1 xl:min-h-0"
            topicsClassName="grid-cols-1 grid-rows-3 sm:grid-cols-3 sm:grid-rows-1"
          />
          <LessonLearnedCard
            className="min-h-[120px] xl:col-span-1 xl:row-span-1 xl:min-h-0"
            fileCount={fileCountsByTopic[lessonLearnedTopic.id] ?? 0}
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

        {preview.open ? <FilePreviewOverlay file={preview.file} onClose={() => setPreview({ open: false })} /> : null}

        <VideoLibraryMini
          topicId={ceremonyVideosTopic.id}
          files={filesByTopic[ceremonyVideosTopic.id] ?? []}
          onRefresh={() => void fetchFiles(ceremonyVideosTopic.id)}
        />
      </div>
    </div>
  );
}
