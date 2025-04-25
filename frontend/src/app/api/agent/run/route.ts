import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { activeProcesses, ProcessInfo } from '@/lib/processManager'; // Import shared state and type

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agent ID' }, { status: 400 });
    }

    // Clean up any existing process for this agentId first
    if (activeProcesses[agentId]) {
        console.log(`[Run ${agentId}] Found existing process. Terminating before starting new one.`);
        try {
            activeProcesses[agentId].process.kill();
        } catch (e) {
             console.warn(`[Run ${agentId}] Error killing existing process:`, e);
        }
        delete activeProcesses[agentId];
    }


    // Get agent path
    const agentsDir = path.join(process.cwd(), '..', 'agents', 'generated');
    const agentPath = path.join(agentsDir, `${agentId}.py`);
    const projectRootDir = path.join(process.cwd(), '..'); // Assuming project root is one level up

    // Verify agent exists
    try {
      await fs.access(agentPath);
    } catch (error) {
       console.error(`[Run ${agentId}] Agent file not found at: ${agentPath}`);
      return NextResponse.json({ error: 'Agent file not found' }, { status: 404 });
    }

    console.log(`[Run ${agentId}] Spawning agent: python ${agentPath}`);

    const agentProcess = spawn('python', [agentPath], {
        stdio: ['pipe', 'pipe', 'pipe'], // pipe stdin, stdout, stderr
        cwd: projectRootDir, // Set CWD for the agent process
        env: { ...process.env, PYTHONUNBUFFERED: '1' } // Ensure unbuffered output
    });

    // Add to active processes IMMEDIATELY
    // Note: Stream will be added later by the /stream endpoint when it connects
    activeProcesses[agentId] = {
        process: agentProcess,
        stream: null, // Placeholder, stream endpoint will create/attach this
        lastActivity: Date.now(),
    } as unknown as ProcessInfo; // Cast needed as stream is initially null


    agentProcess.on('spawn', () => {
        console.log(`[Run ${agentId}] Process spawned successfully (PID: ${agentProcess.pid}).`);
        activeProcesses[agentId].lastActivity = Date.now(); // Update activity time
    });

    agentProcess.on('error', (err) => {
        console.error(`[Run ${agentId}] Failed to start agent process:`, err);
        delete activeProcesses[agentId]; // Clean up on error
        // Cannot return response here as headers might be sent or process might connect later
    });

    agentProcess.on('close', (code, signal) => {
        console.log(`[Run ${agentId}] Process closed with code ${code}, signal ${signal}`);
        // Clean up the process from the map when it closes - REMOVED
        // Let the processManager interval handle cleanup based on exitCode
        // delete activeProcesses[agentId]; 
    });
    
    agentProcess.stderr.on('data', (data) => {
        console.error(`[Agent ${agentId} STDERR] ${data.toString()}`);
         if (activeProcesses[agentId]) activeProcesses[agentId].lastActivity = Date.now();
    });

    // Don't pipe stdout here, the /stream endpoint will handle it.

    // Return success immediately after spawn attempt
    return NextResponse.json({
      success: true,
      message: 'Agent process started',
      agentId
    });

  } catch (error) {
    const agentId = (request.headers.get('X-Agent-ID') || 'unknown'); // Try to get agentId for logging if body parsing failed
    console.error(`[Run ${agentId}] Error starting agent:`, error);
    // Attempt cleanup if agentId is known and process might exist
     if (agentId !== 'unknown' && activeProcesses[agentId]) {
        try {
             activeProcesses[agentId].process.kill();
        } catch (e) { /* ignore */ }
        delete activeProcesses[agentId];
    }
    return NextResponse.json(
      { error: 'Failed to start agent process' },
      { status: 500 }
    );
  }
}