import { sql } from "drizzle-orm";
import { index, sqliteTableCreator, unique } from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator(
  (name) => `flai-challenge_${name}`,
);

export const campaigns = createTable("campaign", (d) => ({
  id: d.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
}));

export const contacts = createTable(
  "contact",
  (d) => ({
    id: d.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    campaignId: d
      .text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    phone: d.text().notNull(),
    firstName: d.text("first_name").notNull(),
    lastName: d.text("last_name").notNull(),
    vin: d.text().notNull(),
    year: d.integer().notNull(),
    make: d.text().notNull(),
    recallCode: d.text("recall_code").notNull(),
    recallDesc: d.text("recall_desc").notNull(),
    language: d.text().notNull(),
    optOut: d.integer("opt_out", { mode: "boolean" }).notNull().default(false),
  }),
  (t) => [
    index("idx_contacts_phone").on(t.phone),
    unique().on(t.campaignId, t.phone),
  ],
);

export const messages = createTable(
  "message",
  (d) => ({
    id: d.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    campaignId: d
      .text("campaign_id")
      .references(() => campaigns.id, { onDelete: "set null" }),
    contactId: d
      .text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    direction: d.text().notNull(),
    body: d.text().notNull(),
    createdAt: d
      .integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [index("idx_messages_contact_created").on(t.contactId, t.createdAt)],
);

export const appointments = createTable(
  "appointment",
  (d) => ({
    id: d.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    campaignId: d
      .text("campaign_id")
      .references(() => campaigns.id, { onDelete: "set null" }),
    contactId: d
      .text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    scheduledAt: d.integer("scheduled_at", { mode: "timestamp" }).notNull(),
  }),
  (t) => [
    index("idx_appointments_campaign_time").on(t.campaignId, t.scheduledAt),
  ],
);
