export type SummaryProjectPayload = {
  quality: string;
  price: string;
  actual: string;
  delivery: string;
};

export type SessionPayload = {
  projectName: string;
  projectNo: string;
  customer: string;
  ceremonyDate: string;
  summaryProject: SummaryProjectPayload;
};

export const defaultSession: SessionPayload = {
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
};
