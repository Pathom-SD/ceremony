export type CeremonyTopic = {
  id: string;
  label: string;
};

export type CeremonyDepartment = {
  id: string;
  name: string;
  topics: CeremonyTopic[];
};

export const ceremonyDepartments: CeremonyDepartment[] = [
  {
    id: "mk",
    name: "MK",
    topics: [
      { id: "mk-spec-0", label: "SPEC 0" },
      { id: "mk-risk-agreement", label: "Risk Agreement" },
    ],
  },
  {
    id: "med",
    name: "MED",
    topics: [
      {
        id: "med-technical-agreement",
        label: "Technical Agreement & Verify Mechanical Design",
      },
      { id: "med-flow-chart", label: "Flow Chart" },
      { id: "med-engineering-review", label: "Engineering Review" },
      { id: "med-time-chart", label: "Time Chart" },
    ],
  },
  {
    id: "mep",
    name: "MEP",
    topics: [
      { id: "mep-static-accuracy", label: "Static Accuracy Check" },
      { id: "mep-fabrication", label: "Fabrication Check" },
      { id: "mep-assembly", label: "Assembly Check" },
    ],
  },
  {
    id: "ee",
    name: "EE",
    topics: [{ id: "ee-io-programs", label: "I/O Check & Programs Test" }],
  },
  {
    id: "qc",
    name: "QC",
    topics: [{ id: "qc-final-inspection", label: "Final Inspection" }],
  },
  {
    id: "pe",
    name: "PE",
    topics: [
      { id: "pe-summary-project", label: "Summary Project" },
      { id: "pe-mc-punch-list", label: "M/C Punch List" },
      { id: "pe-installation-plan", label: "Installation Plan" },
    ],
  },
];

export const lessonLearnedTopic: CeremonyTopic = {
  id: "lesson-learned",
  label: "Lesson Learned & Challenge Points",
};

/** หัวข้อพิเศษสำหรับวิดีโอห้องประชุม (ใช้เฉพาะลิบรารีวิดีโอแบบ mini player) */
export const ceremonyVideosTopic: CeremonyTopic = {
  id: "ceremony-videos",
  label: "Ceremony videos",
};

const allTopicIds = new Set<string>([
  ...ceremonyDepartments.flatMap((d) => d.topics.map((t) => t.id)),
  lessonLearnedTopic.id,
  ceremonyVideosTopic.id,
]);

export function isValidTopicId(topicId: string): boolean {
  return allTopicIds.has(topicId);
}
