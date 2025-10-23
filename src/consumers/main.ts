import "dotenv/config";
import { startSmsConsumer } from "./sms-consumer";
import { startAgentConsumer } from "./agent-consumer";

async function main(): Promise<void> {
  console.log("Starting consumers...");

  try {
    await Promise.all([startSmsConsumer(), startAgentConsumer()]);
  } catch (error) {
    console.error("Failed to start consumers:", error);
    process.exit(1);
  }
}

main();
