import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, agentName, description } = body;

    if (!code || !agentName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Sanitize agent name for filename
    const safeAgentName = agentName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Create the agents directory if it doesn't exist
    const agentsDir = path.join(process.cwd(), '..', 'agents', 'generated');
    try {
      await fs.mkdir(agentsDir, { recursive: true });
    } catch (err) {
      console.error('Error creating directory:', err);
      return NextResponse.json({ error: 'Failed to create directory for agent' }, { status: 500 });
    }
    
    // Verify the directory was created
    try {
      await fs.access(agentsDir);
    } catch (err) {
      console.error('Directory does not exist after creation attempt:', err);
      return NextResponse.json({ error: 'Failed to create directory for agent' }, { status: 500 });
    }

    // Save the agent file
    const filePath = path.join(agentsDir, `${safeAgentName}.py`);
    await fs.writeFile(filePath, code);

    // Save metadata (for future listing)
    const metadataPath = path.join(agentsDir, 'metadata.json');
    let metadata = { agents: [] };
    
    try {
      // Check if metadata file exists
      try {
        await fs.access(metadataPath);
        // If it exists, read it
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (err) {
        // If the file doesn't exist, create it with default structure
        console.log('Metadata file does not exist, creating it');
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      }
    } catch (err) {
      // If there's an error reading or creating, log it but continue with default
      console.error('Error handling metadata file:', err);
    }

    // Add or update the agent metadata
    const existingIndex = metadata.agents.findIndex(
      (agent: any) => agent.id === safeAgentName
    );

    const newAgent = {
      id: safeAgentName,
      name: agentName,
      description: description || 'A custom MCP agent',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      filePath: `generated/${safeAgentName}.py`,
    };

    if (existingIndex >= 0) {
      metadata.agents[existingIndex] = {
        ...metadata.agents[existingIndex],
        ...newAgent,
      };
    } else {
      metadata.agents.push(newAgent);
    }

    // Write updated metadata
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Agent saved successfully',
      agent: newAgent,
    });
  } catch (error) {
    console.error('Error saving agent:', error);
    return NextResponse.json(
      { error: 'Failed to save agent' },
      { status: 500 }
    );
  }
}