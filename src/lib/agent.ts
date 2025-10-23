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
}

export async function generateAgentResponse(
  context: AgentContext
): Promise<string> {
  console.log("agent part");
  console.log("Context:", JSON.stringify(context, null, 2));

  return "This is a placeholder response from the agent";
}
