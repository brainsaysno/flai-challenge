"use server";

import Handlebars from "handlebars";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { eq, count, countDistinct } from "drizzle-orm";
import { type CsvRecord } from "~/lib/schemas";
import { sendToSmsQueue } from "~/lib/rabbitmq";
import { db } from "~/server/db";
import { campaigns, contacts, messages, appointments } from "~/server/db/schema";

export async function translateTemplate(
  template: string,
  languages: string[]
): Promise<Record<string, string>> {
  try {
    const languagesToTranslate = languages.filter((lang) => lang !== "default");

    const systemPrompt = `You are a professional translator. Translate the following SMS template to the requested language.

The template uses Handlebars syntax (e.g., {{first_name}}, {{last_name}}, {{vin}}) - DO NOT translate these placeholders, keep them exactly as they are.

CRITICAL: Return ONLY the translated text. Do not include any explanations, quotation marks, or additional formatting. Output only the pure translated template text.`;

    const translationPromises = languagesToTranslate.map(async (lang) => {
      const result = await generateText({
        model: openai("gpt-5-nano"),
        system: systemPrompt,
        prompt: `Translate this template to ${lang}:\n\n${template}`,
      });

      return [lang, result.text.trim()] as const;
    });

    const translationResults = await Promise.all(translationPromises);
    const translations = Object.fromEntries(translationResults);

    return {
      default: template,
      ...translations,
    };
  } catch (error) {
    console.error("Error translating template:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to translate template"
    );
  }
}

export async function sendSmsToAll(
  customers: CsvRecord[],
  templates: Record<string, string>
) {
  try {
    const campaign = await db.insert(campaigns).values({}).returning();
    const campaignId = campaign[0]!.id;

    const compiledTemplates: Record<string, HandlebarsTemplateDelegate> = {};
    for (const [lang, template] of Object.entries(templates)) {
      compiledTemplates[lang] = Handlebars.compile(template);
    }

    const contactsData = customers.map((customer) => ({
      campaignId,
      phone: customer.phone,
      firstName: customer.first_name,
      lastName: customer.last_name,
      vin: customer.vin,
      year: parseInt(customer.year, 10),
      make: customer.make,
      recallCode: customer.recall_code,
      recallDesc: customer.recall_desc,
      language: customer.language,
    }));

    await db.insert(contacts).values(contactsData);

    for (const customer of customers) {
      const templateToUse =
        compiledTemplates[customer.language] ?? compiledTemplates["default"];

      if (!templateToUse) {
        throw new Error("No default template found");
      }

      const message = templateToUse(customer);

      await sendToSmsQueue({
        phone: customer.phone,
        message,
        customer: {
          first_name: customer.first_name,
          last_name: customer.last_name,
          vin: customer.vin,
        },
        campaignId,
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

export async function getCampaignFunnelStats(campaignId: string) {
  try {
    const [sentResult, deliveredResult, scheduledResult] = await Promise.all([
      db
        .select({ count: count() })
        .from(contacts)
        .where(eq(contacts.campaignId, campaignId)),
      db
        .select({ count: countDistinct(messages.contactId) })
        .from(messages)
        .where(eq(messages.campaignId, campaignId)),
      db
        .select({ count: count() })
        .from(appointments)
        .where(eq(appointments.campaignId, campaignId)),
    ]);

    console.log("CAMPAIGN", sentResult, deliveredResult, scheduledResult);

    const totalSent = sentResult[0]?.count ?? 0;
    const totalDelivered = deliveredResult[0]?.count ?? 0;
    const totalScheduled = scheduledResult[0]?.count ?? 0;

    return {
      sent: totalSent - totalDelivered,
      delivered: totalDelivered - totalScheduled,
      scheduled: totalScheduled
    };
  } catch (error) {
    console.error("Error getting campaign funnel stats:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to get campaign funnel stats"
    );
  }
}
