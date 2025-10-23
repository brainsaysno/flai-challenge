"use server";

import Handlebars from "handlebars";
import { type CsvRecord } from "~/lib/schemas";
import { sendToSmsQueue } from "~/lib/rabbitmq";
import { db } from "~/server/db";
import { campaigns, contacts } from "~/server/db/schema";

export async function sendSmsToAll(customers: CsvRecord[], template: string) {
  try {
    const campaign = await db.insert(campaigns).values({}).returning();
    const campaignId = campaign[0]!.id;

    const compiledTemplate = Handlebars.compile(template);

    const contactsData = customers.map((customer) => ({
      campaignId,
      phone: customer.phone,
      firstName: customer.first_name,
      lastName: customer.last_name,
      vin: customer.vin,
      year: customer.year,
      make: customer.make,
      recallCode: customer.recall_code,
      recallDesc: customer.recall_desc,
      language: customer.language,
      optOut: customer.opt_out,
    }));

    await db.insert(contacts).values(contactsData);

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

    return { success: true, count: customers.length, campaignId };
  } catch (error) {
    console.error("Error sending SMS to queue:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to send SMS to queue"
    );
  }
}
