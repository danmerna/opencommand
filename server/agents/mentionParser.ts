/**
 * @mention Parser
 * Extracts agent mentions from chat messages and routes tasks to agents
 */

export interface MentionMatch {
  agentId: string;
  agentName: string;
  taskDescription: string;
  confidence: number;
}

/**
 * Parse @mentions from a message
 * Examples:
 *   "@Lead Response draft a response to john@example.com"
 *   "@Executive Board what do you think about this?"
 *   "@Intent Engine generate action items from this context"
 */
export function parseMentions(message: string): MentionMatch[] {
  const mentions: MentionMatch[] = [];

  // Match @AgentName pattern
  const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
  let match;

  while ((match = mentionRegex.exec(message)) !== null) {
    const mentionedName = match[1].toLowerCase();
    const startIndex = match.index + match[0].length;

    // Extract task description (text after @mention until next @mention or end)
    const nextMentionIndex = message.indexOf("@", startIndex);
    const taskDescription =
      nextMentionIndex > -1
        ? message.substring(startIndex, nextMentionIndex).trim()
        : message.substring(startIndex).trim();

    // Match agent names and assign IDs
    const agentMatch = matchAgentName(mentionedName);
    if (agentMatch) {
      mentions.push({
        agentId: agentMatch.id,
        agentName: agentMatch.name,
        taskDescription,
        confidence: agentMatch.confidence,
      });
    }
  }

  return mentions;
}

/**
 * Match mentioned name to registered agent
 */
function matchAgentName(
  mentionedName: string
): { id: string; name: string; confidence: number } | null {
  const agents = [
    {
      id: "lead-response-1",
      names: ["lead response", "lead", "response", "leads", "leadresponse"],
      displayName: "Lead Response Agent",
    },
    {
      id: "executive-board-1",
      names: ["executive board", "board", "executives", "executive", "ceo", "cfo", "cmo", "cto"],
      displayName: "Executive Board",
    },
    {
      id: "intent-engine-1",
      names: ["intent engine", "intent", "engine", "actions", "action items"],
      displayName: "Intent Engine",
    },
    {
      id: "sigma-1",
      names: ["sigma", "σ", "sig", "chat"],
      displayName: "Σ Chat",
    },
  ];

  // Exact match (highest confidence)
  for (const agent of agents) {
    if (agent.names.includes(mentionedName)) {
      return {
        id: agent.id,
        name: agent.displayName,
        confidence: 1.0,
      };
    }
  }

  // Fuzzy match (partial match)
  for (const agent of agents) {
    for (const agentNameVariant of agent.names) {
      if (agentNameVariant.includes(mentionedName) || mentionedName.includes(agentNameVariant)) {
        return {
          id: agent.id,
          name: agent.displayName,
          confidence: 0.8,
        };
      }
    }
  }

  return null;
}

/**
 * Extract command and arguments from task description
 * Examples:
 *   "draft a response to john@example.com" → { command: "draft", args: { email: "john@example.com" } }
 *   "what do you think about this?" → { command: "think", args: { context: "this?" } }
 */
export function parseTaskDescription(
  agentId: string,
  taskDescription: string
): { command: string; args: Record<string, unknown> } {
  const text = taskDescription.toLowerCase().trim();

  // Lead Response Agent commands
  if (agentId === "lead-response-1") {
    if (text.includes("draft") || text.includes("generate")) {
      return {
        command: "draftResponse",
        args: { taskDescription },
      };
    }
    if (text.includes("send") || text.includes("execute")) {
      return {
        command: "executeResponse",
        args: { taskDescription },
      };
    }
    if (text.includes("queue") || text.includes("pending")) {
      return {
        command: "getApprovalQueue",
        args: {},
      };
    }
  }

  // Executive Board commands
  if (agentId === "executive-board-1") {
    if (text.includes("think") || text.includes("perspective")) {
      return {
        command: "boardCascade",
        args: { taskDescription },
      };
    }
    if (text.includes("ceo")) {
      return {
        command: "ceoThinking",
        args: { taskDescription },
      };
    }
    if (text.includes("cfo")) {
      return {
        command: "cfoThinking",
        args: { taskDescription },
      };
    }
    if (text.includes("cmo")) {
      return {
        command: "cmoThinking",
        args: { taskDescription },
      };
    }
    if (text.includes("cto")) {
      return {
        command: "ctoThinking",
        args: { taskDescription },
      };
    }
  }

  // Intent Engine commands
  if (agentId === "intent-engine-1") {
    if (text.includes("action") || text.includes("generate")) {
      return {
        command: "generateActionItems",
        args: { taskDescription },
      };
    }
    if (text.includes("ask board") || text.includes("escalate")) {
      return {
        command: "askBoard",
        args: { taskDescription },
      };
    }
  }

  // Default: pass through as generic task
  return {
    command: "execute",
    args: { taskDescription },
  };
}

/**
 * Build delegation message for agent
 */
export function buildDelegationMessage(
  mention: MentionMatch,
  originalMessage: string
): string {
  return `You have been delegated a task by Σ Chat:\n\n${mention.taskDescription}\n\nOriginal context: ${originalMessage}`;
}

/**
 * Validate mention confidence and suggest corrections if needed
 */
export function validateMentions(mentions: MentionMatch[]): {
  valid: MentionMatch[];
  ambiguous: MentionMatch[];
  invalid: string[];
} {
  const valid = mentions.filter((m) => m.confidence >= 0.9);
  const ambiguous = mentions.filter((m) => m.confidence >= 0.7 && m.confidence < 0.9);
  const invalid = mentions.filter((m) => m.confidence < 0.7).map((m) => m.agentName);

  return { valid, ambiguous, invalid };
}
