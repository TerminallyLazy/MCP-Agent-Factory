import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { registeredServers, MCPServer } from "../../data";

// Cache for MCP clients
const mcpClients = new Map();

// Get or create an MCP client for a server
async function getMcpClient(server: MCPServer) {
  if (mcpClients.has(server.id)) {
    return mcpClients.get(server.id);
  }

  try {
    console.log(`Connecting to MCP server ${server.id} at ${server.url}`);
    const transport = new StreamableHTTPClientTransport(new URL(server.url));

    const client = new Client({
      name: 'mcp-frontend',
      version: '1.0.0',
    });

    await client.connect(transport);

    // Store in cache
    mcpClients.set(server.id, client);
    return client;
  } catch (error) {
    console.error(`Error connecting to MCP server ${server.id}:`, error);
    server.status = 'error';
    throw error;
  }
}

// Clean up MCP server connections and cache
async function disconnectMcpClient(serverId: string) {
  if (mcpClients.has(serverId)) {
    const client = mcpClients.get(serverId);
    try {
      await client.disconnect();
    } catch (error) {
      console.error(`Error disconnecting from MCP server ${serverId}:`, error);
    }
    mcpClients.delete(serverId);
  }
}

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

    const server = registeredServers[serverIndex];

    // If setting to online, try to connect to the server
    if (status === 'online') {
      try {
        console.log(`Attempting to connect to MCP server ${id}`);
        const client = await getMcpClient(server);

        // If we get here, the connection was successful
        console.log(`Successfully connected to MCP server ${id}`);
        server.status = 'online';
        server.lastConnected = new Date().toISOString();
      } catch (error) {
        console.error(`Failed to connect to MCP server ${id}:`, error);
        server.status = 'error';
        return NextResponse.json(
          {
            ...server,
            error: `Failed to connect to server: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          { status: 500 }
        );
      }
    } else if (status === 'offline') {
      // If setting to offline, disconnect from the server
      await disconnectMcpClient(id);
      server.status = 'offline';
    } else {
      // Just update the status
      server.status = status;
    }

    return NextResponse.json(server);
  } catch (error: any) {
    console.error('Error updating server status:', error);
    return NextResponse.json(
      { error: `Invalid request data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 400 }
    );
  }
}
