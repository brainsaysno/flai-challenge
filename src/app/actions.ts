"use server";

import { type CsvRecord } from "~/lib/schemas";

export async function logCustomerData(customers: CsvRecord[]) {
  console.log("Customer data:", customers);
}
