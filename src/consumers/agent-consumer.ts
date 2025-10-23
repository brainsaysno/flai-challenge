import amqp, { type Channel, type ConsumeMessage } from "amqplib";
import { eq, desc } from "drizzle-orm";
import { env } from "~/env";
import { db } from "../server/db/index";
import { contacts, messages } from "../server/db/schema";
import { sendToSmsQueue } from "~/lib/rabbitmq";
import { generateAgentResponse, type AgentContext } from "~/lib/agent";

const RABBITMQ_URL = env.RABBITMQ_URL;
const AGENT_QUEUE = "agent_queue";

interface AgentRequest {
  phone: string;
  message: string;
  customer: {
    first_name: string;
    last_name: string;
    vin: string;
  };
  campaignId?: string;
  contactId: string;
  timestamp: string;
}

async function processAgentRequest(request: AgentRequest): Promise<void> {
  console.log("Processing agent request:", request);

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, request.contactId),
  });

  if (!contact) {
    console.warn(`Contact not found for ID ${request.contactId}`);
    return;
  }

  const conversationHistory = await db
    .select({
      direction: messages.direction,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.contactId, request.contactId))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  const agentContext: AgentContext = {
    message: request.message,
    customer: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      vin: contact.vin,
      year: contact.year,
      make: contact.make,
      recallCode: contact.recallCode,
      recallDesc: contact.recallDesc,
      language: contact.language,
    },
    conversationHistory: conversationHistory.reverse().map((msg) => ({
      direction: msg.direction as "inbound" | "outbound",
      body: msg.body,
      createdAt: msg.createdAt,
    })),
  };

  const agentResponse = await generateAgentResponse(agentContext);

  await sendToSmsQueue({
    phone: contact.phone,
    message: agentResponse,
    customer: {
      first_name: contact.firstName,
      last_name: contact.lastName,
      vin: contact.vin,
    },
    campaignId: request.campaignId ?? contact.campaignId,
    direction: "outbound",
    timestamp: new Date().toISOString(),
  });

  console.log(`Agent response sent to SMS queue for contact ${contact.id}`);
}

export async function startAgentConsumer(): Promise<void> {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel: Channel = await connection.createChannel();

    await channel.assertQueue(AGENT_QUEUE, { durable: true });
    channel.prefetch(1);

    console.log(`[Agent Consumer] Waiting for messages in ${AGENT_QUEUE}...`);

    channel.consume(
      AGENT_QUEUE,
      async (msg: ConsumeMessage | null) => {
        if (msg) {
          try {
            const content = msg.content.toString();
            const request: AgentRequest = JSON.parse(content);

            await processAgentRequest(request);

            channel.ack(msg);
          } catch (error) {
            console.error("[Agent Consumer] Error processing message:", error);
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );

    connection.on("error", (err) => {
      console.error("[Agent Consumer] RabbitMQ connection error:", err);
    });

    connection.on("close", () => {
      console.log("[Agent Consumer] RabbitMQ connection closed");
      process.exit(1);
    });
  } catch (error) {
    console.error("[Agent Consumer] Failed to start:", error);
    process.exit(1);
  }
}
