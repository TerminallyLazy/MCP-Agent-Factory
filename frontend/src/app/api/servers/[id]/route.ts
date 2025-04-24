import { NextRequest, NextResponse } from 'next/server';

// Central store for registered MCP servers
// In production, this would be in a database
let registeredServers = [
  {
    id: 'filesystem-mcp',
    name: 'Filesystem MCP',
    url: 'https://mcp.modelcontextprotocol.io/filesystem',
    status: 'online',
    capabilities: {
      tools: { listChanged: true }
    },
    description: 'Provides file system access capabilities through the Model Context Protocol',
    version: '1.0.0',
    lastConnected: new Date().toISOString()
  },
  {
    id: 'github-mcp',
    name: 'GitHub MCP',
    url: 'https://mcp.modelcontextprotocol.io/github',
    status: 'offline',
    capabilities: {
      tools: { listChanged: true }
    },
    description: 'Provides GitHub repository management through the Model Context Protocol',
    version: '1.0.0',
    lastConnected: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  },
  {
    id: 'fetch-mcp',
    name: 'Fetch MCP',
    url: 'https://mcp.modelcontextprotocol.io/fetch',
    status: 'online',
    capabilities: {
      tools: { listChanged: true }
    },
    description: 'Provides web content fetching through the Model Context Protocol',
    version: '1.0.0',
    lastConnected: new Date().toISOString()
  }
];

// GET a specific MCP server by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`GET /api/servers/${params.id} called`);
  const id = params.id;
  const server = registeredServers.find(s => s.id === id);
  
  if (!server) {
    console.log(`Server not found: ${id}`);
    return NextResponse.json(
      { error: 'Server not found' },
      { status: 404 }
    );
  }
  
  console.log(`Returning server details for ${id}:`, server);
  return NextResponse.json(server);
}

// PUT to update server details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`PUT /api/servers/${params.id} called`);
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
    const updates = await request.json();
    console.log(`Updating server ${id} with:`, updates);
    
    // Only allow updating specific fields
    const allowedUpdates = ['name', 'url', 'description'] as const;
    const updatedServer = { ...registeredServers[serverIndex] };
    
    // Type-safe update of the specific allowed fields
    if (updates.name !== undefined) updatedServer.name = updates.name;
    if (updates.url !== undefined) updatedServer.url = updates.url;
    if (updates.description !== undefined) updatedServer.description = updates.description;
    
    // Update the server in the array
    registeredServers[serverIndex] = updatedServer;
    
    console.log(`Updated server ${id}:`, updatedServer);
    return NextResponse.json(updatedServer);
  } catch (error: any) {
    console.error(`Error updating server ${id}:`, error);
    return NextResponse.json(
      { error: `Failed to update server: ${error.message}` },
      { status: 400 }
    );
  }
}

// DELETE a server by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`DELETE /api/servers/${params.id} called`);
  const id = params.id;
  const serverIndex = registeredServers.findIndex(s => s.id === id);
  
  if (serverIndex === -1) {
    console.log(`Server not found: ${id}`);
    return NextResponse.json(
      { error: 'Server not found' },
      { status: 404 }
    );
  }
  
  console.log(`Deleting server ${id}`);
  // Remove the server from the array
  registeredServers.splice(serverIndex, 1);
  
  console.log(`Server ${id} deleted successfully`);
  return NextResponse.json({ success: true });
}
