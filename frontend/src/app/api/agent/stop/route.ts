import { NextRequest, NextResponse } from 'next/server';
import { activeProcesses } from '@/lib/processManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agent ID' }, { status: 400 });
    }

    // Check if the process exists
    const processInfo = activeProcesses[agentId];
    if (!processInfo || !processInfo.process) {
      console.log(`[Stop ${agentId}] Process not found.`);
      return NextResponse.json({ success: true, message: 'Process not found or already stopped' });
    }

    console.log(`[Stop ${agentId}] Stopping agent process...`);
    
    // Clean up any resources
    try {
      if (processInfo.stream) {
        console.log(`[Stop ${agentId}] Closing stream...`);
        // No need to call close() on the stream as it's a Node.js Readable
      }
      
      console.log(`[Stop ${agentId}] Killing process...`);
      processInfo.process.kill();
      
      // Remove from active processes
      delete activeProcesses[agentId];
      
      return NextResponse.json({ success: true, message: 'Agent process stopped' });
    } catch (error) {
      console.error(`[Stop ${agentId}] Error stopping agent:`, error);
      return NextResponse.json({ 
        error: 'Failed to stop agent process',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`[Stop] Error processing request:`, error);
    return NextResponse.json({ 
      error: 'Failed to process stop request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
