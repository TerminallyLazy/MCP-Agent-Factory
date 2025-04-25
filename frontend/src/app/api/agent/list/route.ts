import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET() {
  try {
    const agentsDir = path.join(process.cwd(), '..', 'agents', 'generated');
    const metadataPath = path.join(agentsDir, 'metadata.json');
    
    // Create directory if it doesn't exist
    try {
      await fs.access(agentsDir);
    } catch (error) {
      await fs.mkdir(agentsDir, { recursive: true });
      // Create empty metadata file
      await fs.writeFile(metadataPath, JSON.stringify({ agents: [] }, null, 2));
    }
    
    // Read metadata file
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      return NextResponse.json({
        agents: metadata.agents || [],
      });
    } catch (error) {
      // If metadata file doesn't exist or is invalid, return empty array
      return NextResponse.json({
        agents: [],
      });
    }
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: 'Failed to list agents' },
      { status: 500 }
    );
  }
}