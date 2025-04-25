export interface Session {
  id: string;
  name: string;
  lastActive: string;
  messageCount: number;
}

// In-memory sessions list (replace with DB in production)
export const sessions: Session[] = [];

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  toolCalls?: ToolCall[];
}

// Store messages per session
export const sessionMessages: Record<string, Message[]> = {}; 