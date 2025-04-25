import { NextRequest, NextResponse } from 'next/server';
import { sessionMessages } from '../../../sessions/data';

// Define types for better type safety
interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  toolCalls?: ToolCall[];
}

// GET messages for a specific session
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const messages = sessionMessages[id] || [];
  
  return NextResponse.json(messages);
}

// POST to add a new message to a session
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const data = await request.json();
    const { content, sender } = data;
    
    if (!content || !sender) {
      return NextResponse.json(
        { error: 'Message content and sender are required' }, 
        { status: 400 }
      );
    }
    
    // Initialize messages array for this session if it doesn't exist
    if (!sessionMessages[id]) {
      sessionMessages[id] = [];
    }
    
    const newMessage = {
      id: `msg-${id}-${sessionMessages[id].length + 1}`,
      content,
      sender,
      timestamp: new Date().toISOString()
    };
    
    sessionMessages[id].push(newMessage);
    
    // In a real app, you would also update the session's lastActive and messageCount
    
    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}
