import { NextRequest, NextResponse } from 'next/server';

// Central store for MCP servers
// In production, this would be in a database
let registeredServers = [
  {
    id: 'filesystem-mcp',
    name: 'Filesystem MCP',
    url: 'https://mcp.modelcontextprotocol.io/filesystem',
    status: 'online',
    capabilities: {
      tools: { listChanged: true }
    }
  },
  {
    id: 'github-mcp',
    name: 'GitHub MCP',
    url: 'https://mcp.modelcontextprotocol.io/github',
    status: 'offline',
    capabilities: {
      tools: { listChanged: true }
    }
  },
  {
    id: 'fetch-mcp',
    name: 'Fetch MCP',
    url: 'https://mcp.modelcontextprotocol.io/fetch',
    status: 'online',
    capabilities: {
      tools: { listChanged: true }
    }
  }
];

// PUT to toggle MCP server status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`PUT /api/servers/${params.id}/status called`);
  const id = params.id;
  const serverIndex = registeredServers.findIndex(s => s.id === id);
  
  if (serverIndex === -1) {
    console.log(`Server not found: ${id}`);
    return NextResponse.json(
      { error: 'Server not found' },
      { status: 404 }
    );
  }
  
  try {
    const data = await request.json();
    console.log('Status update data:', data);
    const { status } = data;
    
    if (status !== 'online' && status !== 'offline' && status !== 'error') {
      console.log(`Invalid status value: ${status}`);
      return NextResponse.json(
        { error: 'Invalid status value. Must be "online", "offline", or "error"' },
        { status: 400 }
      );
    }
    
    // In a real implementation, here you would connect to the actual MCP server
    // using the MCP protocol to verify it's online or to start/stop it
    
    // For now, just update the status
    console.log(`Updating server ${id} status from ${registeredServers[serverIndex].status} to ${status}`);
    registeredServers[serverIndex].status = status;
    
    return NextResponse.json(registeredServers[serverIndex]);
  } catch (error: any) {
    console.error('Error updating server status:', error);
    return NextResponse.json(
      { error: `Invalid request data: ${error.message}` },
      { status: 400 }
    );
  }
}
