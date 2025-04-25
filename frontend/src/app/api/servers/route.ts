import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { registeredServers, MCPServer } from './data';

// Type definition for MCP server
interface McpServer {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  capabilities: {
    tools: { listChanged: boolean };
  };
  description: string;
  version: string;
  lastConnected: string;
}

// Cache for MCP clients
const mcpClients = new Map();

// Get or create an MCP client for a server
async function getMcpClient(server: McpServer) {
  if (mcpClients.has(server.id)) {
    return mcpClients.get(server.id);
  }
  
  try {

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

// GET all registered MCP servers
export async function GET() {
  console.log('GET /api/servers called');
  return NextResponse.json(registeredServers);
}

// POST to register a new MCP server
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/servers called');
    const data = await request.json();
    console.log('Received new server data:', data);
    const { name, url } = data;
    
    if (!name || !url) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Name and URL are required' }, 
        { status: 400 }
      );
    }
    
    // Create a unique ID for the server
    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    console.log(`Created server ID: ${id}`);
    
    // Create new server entry with proper MCP format
    const newServer = {
      id,
      name,
      url,
      status: 'offline' as const,
      capabilities: {
        tools: { listChanged: true }
      },
      description: data.description || `MCP server at ${url}`,
      version: '1.0.0',
      lastConnected: new Date().toISOString()
    };
    
    // Add to the list of registered servers
    console.log('Adding new server:', newServer);
    registeredServers.push(newServer);
    
    return NextResponse.json(newServer, { status: 201 });
  } catch (error: any) {
    console.error('Error registering server:', error);
    return NextResponse.json(
      { error: `Invalid request data: ${error.message}` },
      { status: 400 }
    );
  }
}
