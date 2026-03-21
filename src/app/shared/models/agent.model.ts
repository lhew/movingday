export type MessageRole = 'user' | 'assistant';

export interface AgentMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolUse?: AgentToolUse[];
}

export interface AgentToolUse {
  toolName: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface AgentSession {
  id: string;
  messages: AgentMessage[];
  createdAt: Date;
  lastActivityAt: Date;
}

// Tool definitions sent to the Claude API via the Cloud Function
export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
