import { CeremonyApp } from "@/components/ceremony-app";
import {
  ceremonyDepartments,
  lessonLearnedTopic,
} from "@/lib/ceremony-topics";
import type { StoredFileRecord } from "@/lib/file-types";
import { readFileIndex, readSession } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [initialSession, fileIndex] = await Promise.all([
    readSession(),
    readFileIndex(),
  ]);
  const topicIds = [
    ...ceremonyDepartments.flatMap((department) =>
      department.topics.map((topic) => topic.id),
    ),
    lessonLearnedTopic.id,
  ];
  const initialFilesByTopic = Object.fromEntries(
    topicIds.map((topicId) => [
      topicId,
      fileIndex.files.filter((file) => file.topicId === topicId),
    ]),
  ) as Record<string, StoredFileRecord[]>;

  return (
    <CeremonyApp
      initialSession={initialSession}
      initialFilesByTopic={initialFilesByTopic}
    />
  );
}
