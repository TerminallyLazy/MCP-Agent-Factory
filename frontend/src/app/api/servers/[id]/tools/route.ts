import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { registeredServers, MCPServer } from "../../data";

// GET tools for a specific MCP server (live fetch via MCP protocol)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const server = registeredServers.find((s: MCPServer) => s.id === id);

  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  try {
    const client = new Client({ name: "mcp-frontend-api", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(server.url));
    await client.connect(transport);

    const toolsResponse = await client.listTools();
    const tools = toolsResponse.tools;

    return NextResponse.json(tools);
  } catch (error: any) {
    console.error(`Failed to fetch tools from MCP server ${id}:`, error);
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}
