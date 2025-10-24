import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { checkAvailability, scheduleAppointment } from "./appointments";

export interface AgentContext {
  message: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    vin: string;
    year: number;
    make: string;
    recallCode: string;
    recallDesc: string;
    language: string;
  };
  conversationHistory: Array<{
    direction: "inbound" | "outbound";
    body: string;
    createdAt: Date;
  }>;
  contactId: string;
}

export async function generateAgentResponse(
  context: AgentContext
): Promise<string> {
  const systemPrompt = `Prompt: Dealership Recall Scheduling Assistant (SMS Style)
You are a friendly text-based assistant helping customers schedule recall appointments for their vehicle.

Customer Info:
Name: ${context.customer.firstName} ${context.customer.lastName}
VIN: ${context.customer.vin}
Vehicle: ${context.customer.year} ${context.customer.make}
Recall: ${context.customer.recallDesc} (Code: ${context.customer.recallCode})

Today is ${new Date().toLocaleDateString()} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })}).
Business hours: Monday–Friday, 9 AM–5 PM.
Each recall appointment takes about 1 hour.

---

How You Should Respond (SMS Style):

* Keep replies short, natural, and easy to read — like a helpful person texting from the dealership.
* Always sound professional, friendly, and reassuring.
* Offer available time options grouped logically
  * Example: “We have times between 9–11 AM or 1–3 PM available.”
* If their preferred time isn’t available, suggest the next closest option.
* Once confirmed, send a short final text summarizing the appointment (day, time, and that it takes 1 hour).
* Always reply - even if just to confirm, clarify, or politely redirect to recall scheduling if they ask unrelated questions.
* Once the appointment is scheduled, just close the conversation out, no need to follow up further.

Example Style:

"Hi ${context.customer.firstName}, this is your ${context.customer.make} recall scheduling assistant. I can help you set up your recall service. Would you like to come in this week or next week?"

"Thanks! We have 1-hour openings between 9–11 AM or 1–3 PM. Which works best for you?"

"Perfect! I’ve booked your recall appointment for Tuesday at 1 PM. It’ll take about an hour. See you then!"
`;

  const messages = [
    ...context.conversationHistory.map((msg) => ({
      role: msg.direction === "inbound" ? ("user" as const) : ("assistant" as const),
      content: msg.body,
    })),
    {
      role: "user" as const,
      content: context.message,
    },
  ];

  const result = await generateText({
    model: openai("gpt-5-nano"),
    system: systemPrompt,
    stopWhen: stepCountIs(3),
    messages,
    tools: {
      checkAvailability: {
        description:
          "Check available appointment time slots for a specific date. Returns available times between 9 AM and 5 PM on weekdays only.",
        inputSchema: z.object({
          date: z
            .string()
            .describe(
              "The date to check availability for, in YYYY-MM-DD format (e.g., 2024-03-15)"
            ),
        }),
        execute: async ({ date }) => {
          const availableSlots = await checkAvailability(
            date
          );

          if (availableSlots.length === 0) {
            return {
              date,
              available: false,
              message:
                "No available time slots for this date. It may be a weekend or all slots are booked.",
              slots: [],
            };
          }

          return {
            date,
            available: true,
            message: `Available time slots for ${date}:`,
            slots: availableSlots,
          };
        },
      },
      scheduleAppointment: {
        description:
          "Schedule a service appointment for a specific date and time. The appointment must be during business hours (Mon-Fri, 9 AM - 5 PM).",
        inputSchema: z.object({
          dateTime: z
            .string()
            .describe(
              "The full appointment date and time in ISO 8601 format (e.g., 2024-03-15T10:00:00)"
            ),
        }),
        execute: async ({ dateTime }) => {
          const result = await scheduleAppointment(
            context.contactId,
            dateTime
          );

          return {
            success: result.success,
            message: result.message,
            appointmentId: result.appointmentId,
          };
        },
      },
    },
  });

  return result.text;
}
