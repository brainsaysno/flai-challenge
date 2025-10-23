import amqp, { type Channel, type ChannelModel } from "amqplib";
import { env } from "~/env";

const RABBITMQ_URL = env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
const SMS_QUEUE = "sms_queue";

let channelModel: ChannelModel | null = null;
let channel: Channel | null = null;

async function getChannel(): Promise<Channel> {
  if (!channelModel) {
    channelModel = await amqp.connect(RABBITMQ_URL);

    channelModel.on("error", (err) => {
      console.error("RabbitMQ connection error:", err);
      channelModel = null;
      channel = null;
    });

    channelModel.on("close", () => {
      console.log("RabbitMQ connection closed");
      channelModel = null;
      channel = null;
    });
  }

  if (!channel) {
    channel = await channelModel.createChannel();
    await channel.assertQueue(SMS_QUEUE, { durable: true });
  }

  return channel;
}

export async function sendToSmsQueue(message: unknown): Promise<void> {
  const ch = await getChannel();
  const messageBuffer = Buffer.from(JSON.stringify(message));

  ch.sendToQueue(SMS_QUEUE, messageBuffer, { persistent: true });
}

export async function closeRabbitMQ(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (channelModel) {
    await channelModel.close();
    channelModel = null;
  }
}
