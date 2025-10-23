"use server";

import Handlebars from "handlebars";
import { type CsvRecord } from "~/lib/schemas";
import { sendToSmsQueue } from "~/lib/rabbitmq";

export async function sendSmsToAll(customers: CsvRecord[], template: string) {
  try {
    const compiledTemplate = Handlebars.compile(template);

    for (const customer of customers) {
      const message = compiledTemplate(customer);

      await sendToSmsQueue({
        phone: customer.phone,
        message,
        customer: {
          first_name: customer.first_name,
          last_name: customer.last_name,
          vin: customer.vin,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true, count: customers.length };
  } catch (error) {
    console.error("Error sending SMS to queue:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to send SMS to queue"
    );
  }
}
