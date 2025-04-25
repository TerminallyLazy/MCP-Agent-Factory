import { NextRequest } from 'next/server';
import { activeProcesses, ProcessInfo } from '@/lib/processManager';
import { Readable, Transform } from 'stream';
import { ChildProcess } from 'child_process';
import { PassThrough } from 'stream';

// Helper function to create a Node.js Readable stream from a child process stdout/stderr
function streamFromChildProcess(childProcess: ChildProcess, agentId: string): Readable {
  // Create a PassThrough stream that will be more stable for SSE
  const outputStream = new PassThrough();

  // Send a comment to keep the connection alive initially
  outputStream.write(': connection established\n\n');

  // Send a heartbeat every 15 seconds to keep the connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      if (!outputStream.destroyed) {
        outputStream.write(': heartbeat\n\n');
        console.log(`[Stream ${agentId}] Sent heartbeat`);
      } else {
        clearInterval(heartbeatInterval);
      }
    } catch (err) {
      console.error(`[Stream ${agentId}] Error sending heartbeat:`, err);
      clearInterval(heartbeatInterval);
    }
  }, 15000);

  // Function to send an event to the client
  const sendEvent = (eventData: object) => {
    try {
      // Update last activity time whenever there's output
      if (activeProcesses[agentId]) {
        activeProcesses[agentId].lastActivity = Date.now();
      }

      // Check if the stream is still writable before pushing
      if (!outputStream.destroyed) {
        outputStream.write(`data: ${JSON.stringify(eventData)}\n\n`);
      } else {
        console.warn(`[Stream ${agentId}] Attempted to write to destroyed stream.`);
        clearInterval(heartbeatInterval);
      }
    } catch (e) {
      console.error(`[Stream ${agentId}] Error sending event:`, e);
      if (!outputStream.destroyed) {
        try {
          outputStream.end();
        } catch (err) {
          console.error(`[Stream ${agentId}] Error ending stream:`, err);
        }
      }
      clearInterval(heartbeatInterval);
    }
  };

  // Send an initial connection message
  sendEvent({ type: 'system', data: 'Connection established with agent process.' });

  // --- Attach listeners to the EXISTING process ---
  const stdoutListener = (data: Buffer) => {
    const output = data.toString();
    console.log(`[Stream ${agentId}] STDOUT: ${output.substring(0, 100)}${output.length > 100 ? '...' : ''}`);
    sendEvent({ type: 'stdout', data: output });
  };

  const stderrListener = (data: Buffer) => {
    const errorText = data.toString();
    console.log(`[Stream ${agentId}] STDERR: ${errorText.substring(0, 100)}${errorText.length > 100 ? '...' : ''}`);

    let errorType = 'stderr';
    if (errorText.includes('ModuleNotFoundError')) {
      errorType = 'module-error';
    } else if (errorText.includes('ImportError')) {
      errorType = 'import-error';
    } else if (errorText.includes('FileNotFoundError')) {
      errorType = 'file-error';
    }
    sendEvent({ type: errorType, data: errorText });
  };

  const closeListener = (code: number | null, signal: NodeJS.Signals | null) => {
    console.log(`[Stream ${agentId}] Process closed event received (Code: ${code}, Signal: ${signal}).`);
    sendEvent({ type: 'exit', code: code ?? undefined, signal: signal ?? undefined });

    // Clean up
    clearInterval(heartbeatInterval);

    // End the stream after a short delay to ensure the exit message is sent
    setTimeout(() => {
      if (!outputStream.destroyed) {
        try {
          outputStream.end();
        } catch (err) {
          console.error(`[Stream ${agentId}] Error ending stream after process close:`, err);
        }
      }
    }, 500);
  };

  const errorListener = (err: Error) => {
    console.error(`[Stream ${agentId}] Process error event received:`, err);
    sendEvent({ type: 'error', error: err.message });

    // Clean up
    clearInterval(heartbeatInterval);

    // End the stream after a short delay to ensure the error message is sent
    setTimeout(() => {
      if (!outputStream.destroyed) {
        try {
          outputStream.end();
        } catch (err) {
          console.error(`[Stream ${agentId}] Error ending stream after process error:`, err);
        }
      }
    }, 500);
  };

  // Attach listeners to the child process
  childProcess.stdout?.on('data', stdoutListener);
  childProcess.stderr?.on('data', stderrListener);
  childProcess.on('close', closeListener);
  childProcess.on('error', errorListener);

  // Handle stream cleanup when the client disconnects
  outputStream.on('close', () => {
    console.log(`[Stream ${agentId}] Stream closed (client disconnected). Cleaning up resources.`);

    // Clean up the interval
    clearInterval(heartbeatInterval);

    // Remove listeners from the child process
    childProcess.stdout?.off('data', stdoutListener);
    childProcess.stderr?.off('data', stderrListener);
    // Don't remove close/error listeners as they're needed for process termination detection

    // Clear the stream reference in activeProcesses
    if (activeProcesses[agentId] && activeProcesses[agentId].stream === outputStream) {
      console.log(`[Stream ${agentId}] Clearing stream reference from activeProcesses.`);
      activeProcesses[agentId].stream = null;
    }
  });

  return outputStream;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const timestamp = searchParams.get('t'); // For cache busting

    // Enhanced headers for better browser compatibility
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Prevents buffering in Nginx
      'Access-Control-Allow-Origin': '*', // CORS support
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    const sendError = (message: string, status: number) => {
      console.error(`[Stream ${agentId || 'unknown'}] Error: ${message} (${status})`);
      return new Response(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`, {
        status,
        headers
      });
    };

    if (!agentId) {
      return sendError('Missing agent ID', 400);
    }

    console.log(`[Stream ${agentId}] Received stream request. Timestamp: ${timestamp || 'none'}`);

    // --- Find the existing process started by /run ---
    const processInfo = activeProcesses[agentId];

    if (!processInfo) {
      console.warn(`[Stream ${agentId}] Process info not found.`);
      return sendError('Agent process not found. Please run the agent again.', 404);
    }

    if (!processInfo.process) {
      console.warn(`[Stream ${agentId}] Process object is missing.`);
      delete activeProcesses[agentId]; // Clean up invalid entry
      return sendError('Agent process is invalid. Please run the agent again.', 404);
    }

    if (processInfo.process.exitCode !== null) {
      console.warn(`[Stream ${agentId}] Process has already exited with code ${processInfo.process.exitCode}.`);
      delete activeProcesses[agentId]; // Clean up exited process
      return sendError('Agent process has already exited. Please run the agent again.', 404);
    }

    // Safety check: Ensure stdin exists (it should have been created by /run)
    if (!processInfo.process.stdin) {
      console.error(`[Stream ${agentId}] Process stdin is missing.`);
      return sendError('Agent process stdin is not available.', 500);
    }

    if (processInfo.process.stdin.destroyed) {
      console.error(`[Stream ${agentId}] Process stdin is destroyed.`);
      return sendError('Agent process stdin is closed.', 500);
    }

    // Check if another stream is already attached
    if (processInfo.stream && !processInfo.stream.destroyed) {
      console.log(`[Stream ${agentId}] Found existing active stream. Closing old stream and creating a new one.`);
      try {
        // Instead of returning an error, close the old stream and create a new one
        processInfo.stream.destroy();
      } catch (err) {
        console.error(`[Stream ${agentId}] Error destroying old stream:`, err);
      }
    }

    console.log(`[Stream ${agentId}] Creating new stream.`);

    // Create a new stream and attach listeners to the existing process
    const stream = streamFromChildProcess(processInfo.process, agentId);

    // Store the new stream reference
    processInfo.stream = stream;
    processInfo.lastActivity = Date.now(); // Update activity time

    console.log(`[Stream ${agentId}] Attached stream. Current active processes: ${Object.keys(activeProcesses).length}`);

    // Return the Node.js Readable stream for SSE
    return new Response(stream as any, { headers });
  } catch (error) {
    console.error(`[Stream] Unexpected error:`, error);
    return new Response(`data: ${JSON.stringify({
      type: 'error',
      error: 'An unexpected error occurred. Please try again.'
    })}\n\n`, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  }
}