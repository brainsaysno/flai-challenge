"use server";

import { eq, desc, asc, or, like, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { contacts, messages } from "~/server/db/schema";

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

export async function sendSmsMessage(
  contactId: string,
  messageBody: string
): Promise<SmsMessage> {
  const [newMessage] = await db
    .insert(messages)
    .values({
      contactId,
      direction: "outbound",
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
