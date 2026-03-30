import { invokeLLM } from "../../_core/llm";

/**
 * Σ Chat + Lead Response Integration
 * Allows users to interact with Lead Response Agent through natural conversation
 */

export interface SigmaLeadResponseContext {
  userId: number;
  companyId: number;
  dealerSlug: string;
  dealerName: string;
  dealerPhone?: string;
}

export interface SigmaLeadMessage {
  role: "user" | "assistant";
  content: string;
  action?: "show_leads" | "draft_response" | "send_response" | "show_history";
  metadata?: Record<string, any>;
}

/**
 * Process natural language request for lead response operations
 */
export async function processSigmaLeadRequest(
  userMessage: string,
  context: SigmaLeadResponseContext
): Promise<{
  response: string;
  action?: string;
  data?: any;
}> {
  console.log(`[Sigma Lead] Processing: ${userMessage}`);

  // Detect intent from user message
  const intent = detectLeadIntent(userMessage);

  switch (intent) {
    case "show_leads":
      return await handleShowLeads(context);

    case "draft_response":
      return await handleDraftResponse(userMessage, context);

    case "send_response":
      return await handleSendResponse(userMessage, context);

    case "show_history":
      return await handleShowHistory(context);

    case "help":
      return {
        response: `I can help you with lead management. Try asking:
- "Show me pending leads"
- "Draft a response for lead #123"
- "Send the response"
- "Show my execution history"`,
      };

    default:
      return {
        response: `I'm not sure what you're asking. I can help with lead responses. Type "help" for options.`,
      };
  }
}

/**
 * Detect user intent from message
 */
function detectLeadIntent(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("show") && lower.includes("lead")) return "show_leads";
  if (lower.includes("draft") || lower.includes("generate")) return "draft_response";
  if (lower.includes("send")) return "send_response";
  if (lower.includes("history") || lower.includes("executed")) return "show_history";
  if (lower.includes("help")) return "help";

  return "unknown";
}

/**
 * Handle "show leads" request
 */
async function handleShowLeads(context: SigmaLeadResponseContext): Promise<{
  response: string;
  action: string;
  data: any;
}> {
  // In real implementation, would call trpc.leadResponse.getPendingLeads
  const mockLeads = [
    {
      id: 1,
      actionText: "Buyer interested in John Deere 7530",
      from: "buyer@farm.com",
      riskLevel: "medium",
      status: "pending",
    },
    {
      id: 2,
      actionText: "Inquiry about Case IH equipment financing",
      from: "operator@agribusiness.com",
      riskLevel: "low",
      status: "pending",
    },
  ];

  const response = `I found ${mockLeads.length} pending leads:

${mockLeads.map((lead) => `• **Lead #${lead.id}**: ${lead.actionText}\n  From: ${lead.from}\n  Risk: ${lead.riskLevel}`).join("\n\n")}

Which lead would you like to draft a response for?`;

  return {
    response,
    action: "show_leads",
    data: mockLeads,
  };
}

/**
 * Handle "draft response" request
 */
async function handleDraftResponse(
  userMessage: string,
  context: SigmaLeadResponseContext
): Promise<{
  response: string;
  action: string;
  data: any;
}> {
  // Extract lead ID from message
  const leadIdMatch = userMessage.match(/#(\d+)/);
  const leadId = leadIdMatch ? parseInt(leadIdMatch[1]) : 1;

  // Mock draft response
  const draftedResponse = {
    subject: "Your Equipment Inquiry - Johnson Tractor",
    body: `Hello,

Thank you for your interest in our equipment. We have several options that match your needs.

We'd like to discuss your specific requirements and provide you with a personalized quote.

Best regards,
Johnson Tractor Sales Team`,
    htmlBody: `<p>Hello,</p><p>Thank you for your interest in our equipment. We have several options that match your needs.</p><p>We'd like to discuss your specific requirements and provide you with a personalized quote.</p><p>Best regards,<br/>Johnson Tractor Sales Team</p>`,
    estimatedConversionRate: 32,
  };

  const response = `I've drafted a response for lead #${leadId}:

**Subject:** ${draftedResponse.subject}

**Message:**
${draftedResponse.body}

**Estimated Conversion Rate:** ${draftedResponse.estimatedConversionRate}%

Would you like me to send this, or would you prefer to regenerate it?`;

  return {
    response,
    action: "draft_response",
    data: {
      leadId,
      draft: draftedResponse,
    },
  };
}

/**
 * Handle "send response" request
 */
async function handleSendResponse(
  userMessage: string,
  context: SigmaLeadResponseContext
): Promise<{
  response: string;
  action: string;
  data: any;
}> {
  // In real implementation, would call trpc.leadResponse.executeResponse
  const response = `✅ Response sent successfully!

**Message ID:** msg_abc123def456
**Recipient:** buyer@farm.com
**Subject:** Your Equipment Inquiry - Johnson Tractor

The buyer will receive your personalized response shortly. I'll track opens and replies for you.`;

  return {
    response,
    action: "send_response",
    data: {
      messageId: "msg_abc123def456",
      status: "sent",
    },
  };
}

/**
 * Handle "show history" request
 */
async function handleShowHistory(context: SigmaLeadResponseContext): Promise<{
  response: string;
  action: string;
  data: any;
}> {
  // In real implementation, would call trpc.leadResponse.getExecutionHistory
  const mockHistory = [
    {
      id: 1,
      recipient: "john.smith@farm.com",
      subject: "Your Equipment Inquiry",
      sentAt: "2026-03-30T10:30:00Z",
      status: "delivered",
      opened: true,
      replied: false,
    },
    {
      id: 2,
      recipient: "mary.johnson@agribusiness.com",
      subject: "Equipment Options for Your Operation",
      sentAt: "2026-03-29T14:15:00Z",
      status: "delivered",
      opened: true,
      replied: true,
    },
  ];

  const response = `Here's your execution history:

${mockHistory
  .map(
    (item) =>
      `• **${item.recipient}**\n  Subject: ${item.subject}\n  Status: ${item.status} ${item.opened ? "📖 Opened" : ""} ${item.replied ? "💬 Replied" : ""}`
  )
  .join("\n\n")}

**Summary:** ${mockHistory.filter((h) => h.opened).length} opened, ${mockHistory.filter((h) => h.replied).length} replied`;

  return {
    response,
    action: "show_history",
    data: mockHistory,
  };
}

/**
 * Format lead response for Σ conversation display
 */
export function formatLeadResponseForSigma(message: SigmaLeadMessage): string {
  if (message.role === "assistant") {
    return message.content;
  }

  // User message - format as action
  return `**You:** ${message.content}`;
}
