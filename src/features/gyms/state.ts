export type GymActionState = Readonly<{ status: "idle" | "error" | "success"; message?: string }>;
export const initialGymActionState: GymActionState = { status: "idle" };

export type FirstGymFormValues = Readonly<{
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  countryCode: string;
}>;

export type FirstGymActionState = Readonly<{
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof FirstGymFormValues, string>>;
  values?: FirstGymFormValues;
}>;

export const initialFirstGymActionState: FirstGymActionState = { status: "idle" };
