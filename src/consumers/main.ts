import "dotenv/config";
import { startSmsConsumer } from "./sms-consumer";

async function main(): Promise<void> {
  console.log("Starting consumers...");

  try {
    await startSmsConsumer();
  } catch (error) {
    console.error("Failed to start consumers:", error);
    process.exit(1);
  }
}

main();
