export type SessionPayload = {
  projectName: string;
  projectNo: string;
  customer: string;
  ceremonyDate: string;
};

export const defaultSession: SessionPayload = {
  projectName: "",
  projectNo: "",
  customer: "",
  ceremonyDate: "",
};
