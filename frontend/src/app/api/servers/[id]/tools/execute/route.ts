import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { registeredServers, MCPServer } from "../../../data";

// Cache for MCP clients to avoid reconnecting for every call
const mcpClients: Map<string, { client: Client, lastUsed: number }> = new Map();

// Maximum age for cached clients (15 minutes)
const MAX_CLIENT_AGE = 15 * 60 * 1000;

// Clean up stale clients
function cleanupStaleClients() {
  const now = Date.now();
  for (const [serverId, { lastUsed }] of mcpClients.entries()) {
    if (now - lastUsed > MAX_CLIENT_AGE) {
      console.log(`Cleaning up stale MCP client for server ${serverId}`);
      mcpClients.delete(serverId);
    }
  }
}

// Get or create a client for a server
async function getOrCreateClient(serverId: string): Promise<Client> {
  // Clean up stale clients
  cleanupStaleClients();

  // Check if we have a cached client
  const cachedClient = mcpClients.get(serverId);
  if (cachedClient) {
    // Update last used time
    cachedClient.lastUsed = Date.now();
    return cachedClient.client;
  }

  // Get server information
  const server = registeredServers.find((s: MCPServer) => s.id === serverId);
  if (!server) {
    throw new Error(`Server with ID ${serverId} not found`);
  }

  // Create a new client
  const client = new Client({ name: "mcp-frontend-api", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(server.url));
  await client.connect(transport);

  // Cache the client
  mcpClients.set(serverId, { client, lastUsed: Date.now() });

  return client;
}

// POST to execute a tool on an MCP server
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serverId = params.id;
  const server = registeredServers.find((s: MCPServer) => s.id === serverId);

  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  if (server.status !== 'online') {
    return NextResponse.json({ error: "Server is not online" }, { status: 400 });
  }

  try {
    const { toolName, parameters } = await request.json();

    if (!toolName) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    // Get or create client
    const client = await getOrCreateClient(serverId);

    // Execute the tool
    console.log(`Executing tool ${toolName} on server ${serverId} with parameters:`, parameters);
    const result = await client.callTool(toolName, parameters || {});

    return NextResponse.json({
      name: toolName,
      parameters: parameters || {},
      status: 'success',
      result
    });
  } catch (error: any) {
    console.error(`Failed to execute tool on MCP server ${serverId}:`, error);
    
    // Remove the client from the cache if there was an error
    mcpClients.delete(serverId);
    
    return NextResponse.json({
      name: error.toolName || "unknown",
      parameters: error.parameters || {},
      status: 'error',
      result: error.message || "Failed to execute tool"
    }, { status: 500 });
  }
}