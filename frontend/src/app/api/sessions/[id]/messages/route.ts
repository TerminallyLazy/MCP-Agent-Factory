import { NextRequest, NextResponse } from 'next/server';

// Note: In a production environment, you would use a database
// This is a simple in-memory store for demonstration purposes
const sessionMessages = {
  'session-1': [
    {
      id: 'msg-1-1',
      content: 'Hello! I need help setting up my project.',
      sender: 'user',
      timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    {
      id: 'msg-1-2',
      content: 'I can help you set up your project. What kind of project are you working on?',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 3590000).toISOString() // 59 minutes 50 seconds ago
    },
    {
      id: 'msg-1-3',
      content: 'I\'m working on an MCP integration project.',
      sender: 'user',
      timestamp: new Date(Date.now() - 3580000).toISOString() // 59 minutes 40 seconds ago
    },
    {
      id: 'msg-1-4',
      content: 'For an MCP integration, you\'ll need to set up several components. Let me help you organize that.',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 3570000).toISOString(), // 59 minutes 30 seconds ago
      toolCalls: [
        {
          name: 'create_directory',
          parameters: {
            path: '/home/user/mcp-project'
          }
        }
      ]
    }
  ],
  'session-2': [
    {
      id: 'msg-2-1',
      content: 'I need help with the API integration.',
      sender: 'user',
      timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: 'msg-2-2',
      content: 'What specific part of the API are you trying to integrate?',
      sender: 'assistant',
      timestamp: new Date(Date.now() - 86390000).toISOString() // 1 day - 10 seconds ago
    }
  ]
};

// GET messages for a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const messages = sessionMessages[id] || [];
  
  return NextResponse.json(messages);
}

// POST to add a new message to a session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
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
