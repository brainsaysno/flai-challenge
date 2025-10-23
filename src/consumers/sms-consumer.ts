import amqp, { type Channel, type ConsumeMessage } from "amqplib";
import { db } from "../server/db/index";
import { messages } from "../server/db/schema";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
const SMS_QUEUE = "sms_queue";

interface SmsMessage {
  contactId: string;
  campaignId?: string;
  body: string;
  direction: "inbound" | "outbound";
}

async function processSmsMessage(message: SmsMessage): Promise<void> {
  console.log("Processing SMS message:", message);

  await db.insert(messages).values({
    contactId: message.contactId,
    campaignId: message.campaignId,
    body: message.body,
    direction: message.direction,
  });

  console.log(`SMS message saved to database for contact ${message.contactId}`);
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
