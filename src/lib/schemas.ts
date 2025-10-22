import { z } from "zod";

export const csvRecordSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  vin: z.string().min(1, "VIN is required"),
  year: z.string().min(1, "Year is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  recall_code: z.string().min(1, "Recall code is required"),
  recall_desc: z.string().min(1, "Recall description is required"),
  language: z.string().min(1, "Language is required"),
  priority: z.string().min(1, "Priority is required"),
});

export type CsvRecord = z.infer<typeof csvRecordSchema>;
