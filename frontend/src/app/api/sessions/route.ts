import { NextRequest, NextResponse } from 'next/server';
import { sessions, Session } from './data';

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
