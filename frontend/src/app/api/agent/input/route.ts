import { NextRequest, NextResponse } from 'next/server';
import { activeProcesses } from '@/lib/processManager'; // Import shared state

// // NOTE: This assumes 'activeProcesses' is accessible. ...
// // This needs to be addressed for the functionality to work.
// const activeProcesses: Record<string, { process: any; lastActivity: number }> = {}; // Placeholder - needs refactoring

export async function POST(request: NextRequest) {
  let agentId = 'unknown';

  try {
    const body = await request.json();
    agentId = body.agentId || 'unknown';
    const input = body.input;

    console.log(`[Input ${agentId}] Received input request: ${input ? input.substring(0, 20) + (input.length > 20 ? '...' : '') : 'undefined'}`);

    if (!agentId || typeof input === 'undefined') {
      console.error(`[Input ${agentId}] Missing agent ID or input`);
      return NextResponse.json({ error: 'Missing agent ID or input' }, { status: 400 });
    }

    // Access the shared process map
    const processInfo = activeProcesses[agentId];
    console.log(`[Input ${agentId}] Process info found: ${!!processInfo}`);

    if (!processInfo || !processInfo.process) {
      console.warn(`[Input ${agentId}] Process not found.`);
      if (processInfo) delete activeProcesses[agentId]; // Clean up if it exists but is invalid
      return NextResponse.json({ error: 'Agent process not found' }, { status: 404 });
    }

    if (processInfo.process.exitCode !== null) {
      console.warn(`[Input ${agentId}] Process has already exited with code ${processInfo.process.exitCode}.`);
      delete activeProcesses[agentId]; // Clean up exited process
      return NextResponse.json({ error: 'Agent process has exited' }, { status: 404 });
    }

    if (!processInfo.process.stdin) {
      console.error(`[Input ${agentId}] Stdin is not available.`);
      return NextResponse.json({ error: 'Agent process stdin is not available' }, { status: 500 });
    }

    if (processInfo.process.stdin.destroyed) {
      console.error(`[Input ${agentId}] Stdin is destroyed.`);
      return NextResponse.json({ error: 'Agent process stdin is closed' }, { status: 404 });
    }

    // Update activity time
    processInfo.lastActivity = Date.now();

    // Write input to the agent's stdin
    // Ensure input ends with a newline, as many programs expect line-based input
    console.log(`[Input ${agentId}] Writing to stdin: ${input.substring(0, 20)}${input.length > 20 ? '...' : ''}`);

    const writeSuccess = processInfo.process.stdin.write(input + '\n', (error) => {
      if (error) {
        console.error(`[Input ${agentId}] Error writing to stdin:`, error);
        // We cannot return a response here as headers might be sent already
        // This error might manifest as EPIPE in the catch block
      } else {
        console.log(`[Input ${agentId}] Successfully wrote to stdin`);
      }
    });

    if (!writeSuccess) {
      console.warn(`[Input ${agentId}] stdin write buffer full. Input may be delayed or lost.`);
      // Return a warning but still consider it a success as the data will be written eventually
      return NextResponse.json({
        success: true,
        warning: 'Input buffer full, message may be delayed',
        message: 'Input queued for agent'
      });
    }

    console.log(`[Input ${agentId}] Successfully sent: ${input.substring(0, 20)}${input.length > 20 ? '...' : ''}`);
    return NextResponse.json({ success: true, message: 'Input sent to agent' });

  } catch (error) {
    console.error(`[Input ${agentId}] Error sending input:`, error);

    // Check if the error is related to writing to a closed stream (broken pipe)
    if (error instanceof Error && (error as any).code === 'EPIPE') {
      console.warn(`[Input ${agentId}] Detected EPIPE error (stdin closed).`);
      // Attempt cleanup
      if (activeProcesses[agentId]) {
        delete activeProcesses[agentId];
      }
      return NextResponse.json({ error: 'Agent process is not running or stdin is closed.' }, { status: 404 });
    }

    // For JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to send input to agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}