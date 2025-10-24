import { generateText } from "ai";
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
  const systemPrompt = `You are a helpful service scheduling assistant for ${context.customer.make} recall service.

Customer Information:
- Name: ${context.customer.firstName} ${context.customer.lastName}
- VIN: ${context.customer.vin}
- Vehicle: ${context.customer.year} ${context.customer.make}
- Recall: ${context.customer.recallDesc} (Code: ${context.customer.recallCode})

Your job is to help the customer check availability and schedule their recall service appointment.

Business Hours: Monday-Friday, 9:00 AM - 5:00 PM
Appointment Duration: 1 hour per appointment

Be friendly, professional, and helpful. Use the tools available to check availability and schedule appointments.`;

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
    model: openai("gpt-4-turbo"),
    system: systemPrompt,
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
            context.contactId,
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
