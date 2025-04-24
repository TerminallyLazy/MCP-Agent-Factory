import { NextRequest, NextResponse } from 'next/server';

// Database of registered MCP servers for the UI
// In production, this would be fetched from a database
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

// Static tool data for real MCP servers to avoid connection issues during development
// This would be replaced with actual MCP connections in production
const realToolsByServer: Record<string, any[]> = {
  'filesystem-mcp': [
    {
      id: 'fs-read',
      name: 'read_file',
      description: 'Read content from a file on the filesystem',
      schema: {
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file'
            }
          },
          required: ['path']
        },
        return: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'File content'
            }
          }
        }
      }
    },
    {
      id: 'fs-write',
      name: 'write_file',
      description: 'Write content to a file on the filesystem',
      schema: {
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to write the file'
            },
            content: {
              type: 'string',
              description: 'Content to write'
            }
          },
          required: ['path', 'content']
        },
        return: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the write was successful'
            }
          }
        }
      }
    }
  ],
  'github-mcp': [
    {
      id: 'gh-repos',
      name: 'list_repositories',
      description: 'List GitHub repositories for a user',
      schema: {
        parameters: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'GitHub username'
            }
          },
          required: ['username']
        },
        return: {
          type: 'object',
          properties: {
            repositories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    {
      id: 'gh-issues',
      name: 'list_issues',
      description: 'List issues for a GitHub repository',
      schema: {
        parameters: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner'
            },
            repo: {
              type: 'string',
              description: 'Repository name'
            },
            state: {
              type: 'string',
              description: 'Issue state (open, closed, all)'
            }
          },
          required: ['owner', 'repo']
        },
        return: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  number: { type: 'number' },
                  title: { type: 'string' },
                  body: { type: 'string' },
                  state: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  ],
  'fetch-mcp': [
    {
      id: 'fetch-url',
      name: 'fetch_url',
      description: 'Fetch content from a URL',
      schema: {
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to fetch'
            },
            headers: {
              type: 'object',
              description: 'Optional headers for the request'
            }
          },
          required: ['url']
        },
        return: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Content of the URL'
            },
            status: {
              type: 'number',
              description: 'HTTP status code'
            }
          }
        }
      }
    }
  ]
};

// GET tools for a specific MCP server
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  console.log(`Getting tools for MCP server: ${id}`);
  
  const server = registeredServers.find(s => s.id === id);
  
  if (!server) {
    console.log(`Server not found: ${id}`);
    return NextResponse.json(
      { error: 'Server not found' },
      { status: 404 }
    );
  }
  
  // Check if we have pre-defined tools for this server
  if (realToolsByServer[id]) {
    console.log(`Returning predefined tools for ${id}`);
    return NextResponse.json(realToolsByServer[id]);
  }
  
  // If no predefined tools, return a default set
  console.log(`No predefined tools for ${id}, returning default set`);
  return NextResponse.json([
    {
      id: 'default-tool-1',
      name: 'example_tool',
      description: 'An example tool for this MCP server',
      schema: {
        parameters: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Input parameter'
            }
          },
          required: ['input']
        },
        return: {
          type: 'object',
          properties: {
            output: {
              type: 'string',
              description: 'Output result'
            }
          }
        }
      }
    }
  ]);
}
