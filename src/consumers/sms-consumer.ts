import amqp, { type Channel, type ConsumeMessage } from "amqplib";
import { eq } from "drizzle-orm";
import { env } from "~/env";
import { db } from "../server/db/index";
import { contacts, messages } from "../server/db/schema";
import { sendToAgentQueue } from "~/lib/rabbitmq";

const RABBITMQ_URL = env.RABBITMQ_URL;
const SMS_QUEUE = "sms_queue";

interface SmsMessage {
  phone: string;
  message: string;
  customer: {
    first_name: string;
    last_name: string;
    vin: string;
  };
  campaignId?: string;
  direction?: "inbound" | "outbound";
  timestamp: string;
}

async function processSmsMessage(message: SmsMessage): Promise<void> {
  console.log("Processing SMS message:", message);

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.phone, message.phone),
  });

  if (!contact) {
    console.warn(`Contact not found for phone ${message.phone}`);
    return;
  }

  await db.insert(messages).values({
    contactId: contact.id,
    campaignId: message.campaignId ?? contact.campaignId,
    body: message.message,
    direction: message.direction ?? "outbound",
  });

  console.log(`SMS message saved to database for contact ${contact.id}`);

  if (message.direction === "inbound") {
    await sendToAgentQueue({
      phone: message.phone,
      message: message.message,
      customer: message.customer,
      campaignId: message.campaignId ?? contact.campaignId,
      contactId: contact.id,
      timestamp: message.timestamp,
    });

    console.log(`Inbound message sent to agent queue for contact ${contact.id}`);
  }
}

export async function startSmsConsumer(): Promise<void> {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel: Channel = await connection.createChannel();

    await channel.assertQueue(SMS_QUEUE, { durable: true });
    channel.prefetch(1);

    console.log(`[SMS Consumer] Waiting for messages in ${SMS_QUEUE}...`);

    channel.consume(
      SMS_QUEUE,
      async (msg: ConsumeMessage | null) => {
        if (msg) {
          try {
            const content = msg.content.toString();
            const message: SmsMessage = JSON.parse(content);

            await processSmsMessage(message);

            channel.ack(msg);
          } catch (error) {
            console.error("[SMS Consumer] Error processing message:", error);
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );

    connection.on("error", (err) => {
      console.error("[SMS Consumer] RabbitMQ connection error:", err);
    });

    connection.on("close", () => {
      console.log("[SMS Consumer] RabbitMQ connection closed");
      process.exit(1);
    });
  } catch (error) {
    console.error("[SMS Consumer] Failed to start:", error);
    process.exit(1);
  }
}
