"use server";

import { eq, asc, or, like, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { contacts, messages, appointments } from "~/server/db/schema";
import { sendToSmsQueue } from "~/lib/rabbitmq";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface SmsMessage {
  id: string;
  contactId: string;
  direction: "inbound" | "outbound";
  body: string;
  createdAt: Date;
  contact?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export interface Appointment {
  id: string;
  contactId: string;
  campaignId: string | null;
  scheduledAt: Date;
}

export async function sendSmsMessage(
  contactId: string,
  messageBody: string
): Promise<void> {
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  await sendToSmsQueue({
    phone: contact.phone,
    message: messageBody,
    customer: {
      first_name: contact.firstName,
      last_name: contact.lastName,
      vin: contact.vin,
    },
    campaignId: contact.campaignId,
    direction: "inbound",
    timestamp: new Date().toISOString(),
  });
}

export async function getSmsMessages(contactId?: string): Promise<SmsMessage[]> {
  const query = contactId
    ? db
      .select({
        id: messages.id,
        contactId: messages.contactId,
        direction: messages.direction,
        body: messages.body,
        createdAt: messages.createdAt,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        phone: contacts.phone,
      })
      .from(messages)
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .where(eq(messages.contactId, contactId))
      .orderBy(asc(messages.createdAt))
    : db
      .select({
        id: messages.id,
        contactId: messages.contactId,
        direction: messages.direction,
        body: messages.body,
        createdAt: messages.createdAt,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        phone: contacts.phone,
      })
      .from(messages)
      .leftJoin(contacts, eq(messages.contactId, contacts.id))
      .orderBy(asc(messages.createdAt));

  const results = await query;

  return results.map((row) => ({
    id: row.id,
    contactId: row.contactId,
    direction: row.direction as "inbound" | "outbound",
    body: row.body,
    createdAt: row.createdAt,
    contact: row.firstName && row.lastName && row.phone
      ? {
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
      }
      : undefined,
  }));
}

export async function searchContacts(query: string): Promise<Contact[]> {
  if (!query.trim()) {
    const allContacts = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        phone: contacts.phone,
      })
      .from(contacts)
      .limit(50);

    return allContacts;
  }

  const searchTerm = `%${query.toLowerCase()}%`;

  const results = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(
      or(
        like(sql`lower(${contacts.firstName})`, searchTerm),
        like(sql`lower(${contacts.lastName})`, searchTerm),
        like(sql`lower(${contacts.firstName} || ' ' || ${contacts.lastName})`, searchTerm)
      )
    )
    .limit(50);

  return results;
}

export async function getContactById(contactId: string): Promise<Contact | undefined> {
  const [contact] = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  return contact;
}

export async function simulateInboundMessage(
  contactId: string,
  messageBody: string
): Promise<SmsMessage> {
  const [newMessage] = await db
    .insert(messages)
    .values({
      contactId,
      direction: "inbound",
      body: messageBody,
    })
    .returning();

  if (!newMessage) {
    throw new Error("Failed to create message");
  }

  return {
    id: newMessage.id,
    contactId: newMessage.contactId,
    direction: newMessage.direction as "inbound" | "outbound",
    body: newMessage.body,
    createdAt: newMessage.createdAt,
  };
}

export async function getAppointments(contactId: string): Promise<Appointment[]> {
  const results = await db
    .select({
      id: appointments.id,
      contactId: appointments.contactId,
      campaignId: appointments.campaignId,
      scheduledAt: appointments.scheduledAt,
    })
    .from(appointments)
    .where(eq(appointments.contactId, contactId))
    .orderBy(asc(appointments.scheduledAt));

  return results;
}
