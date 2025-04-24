import { NextRequest, NextResponse } from 'next/server';

// Note: In a production environment, you would use a database
// This is a simple in-memory store for demonstration purposes
let sessions = [
  {
    id: 'session-1',
    name: 'Project Setup',
    lastActive: new Date().toISOString(),
    messageCount: 8
  },
  {
    id: 'session-2',
    name: 'API Integration',
    lastActive: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    messageCount: 15
  }
];

// GET all sessions
export async function GET() {
  console.log('GET /api/sessions called');
  return NextResponse.json(sessions);
}

// POST to create a new session
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/sessions called');
    const data = await request.json();
    console.log('Session data:', data);
    const { name } = data;
    
    if (!name) {
      console.log('Session creation failed: Name is required');
      return NextResponse.json(
        { error: 'Session name is required' }, 
        { status: 400 }
      );
    }
    
    const newSession = {
      id: `session-${Date.now()}`,
      name,
      lastActive: new Date().toISOString(),
      messageCount: 0
    };
    
    console.log('Creating new session:', newSession);
    sessions.push(newSession);
    
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}
