# MCP Integration

This directory contains the necessary files to integrate the Model Context Protocol (MCP) into your project. MCP allows AI agents to access external tools and capabilities like file system access, web search, and more.

## Directory Structure

```
mcp-integration/
├── agents/                  # Agent implementation
│   ├── __init__.py          # Agent class definition
│   ├── mcp/                 # MCP client implementation
│   │   ├── __init__.py
│   │   ├── agent_factory.py # Factory for creating MCP agents
│   │   ├── client.py        # MCP client implementation
│   │   └── mock_client.py   # Mock client for testing
│   └── tools/               # Tool implementations
│       └── __init__.py
├── docs/                    # Documentation
│   └── MCP_INTEGRATION.md   # Integration guide
├── example.py               # Example usage
├── mcp_config.json          # MCP server configuration
├── README.md                # This file
└── requirements.txt         # Python dependencies
```

## Getting Started

1. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Configure your MCP servers in `mcp_config.json`:
   - Update the file paths for the filesystem server
   - Add your Brave API key for web search

3. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

4. Run the example script:
   ```bash
   # Run the general assistant example
   python example.py --mode general
   
   # Run the tool listing example
   python example.py --mode tools
   ```

## Available Agents

The integration provides several pre-configured agents:

1. **General Assistant Agent**: A general-purpose assistant with access to MCP tools
2. **Tool Listing Agent**: An agent that lists and demonstrates available tools

You can create your own custom agents by using the `create_mcp_agent` function in `agents/mcp/agent_factory.py`.

## Troubleshooting

If you encounter issues with the MCP integration:

1. Check the logs for detailed error messages
2. Verify that Node.js and npm are installed (required for MCP servers)
3. Make sure your OpenAI API key is set correctly
4. Confirm that the paths in `mcp_config.json` are correct for your system

## Documentation

For detailed information on how to integrate MCP into your project, see the [MCP Integration Guide](docs/MCP_INTEGRATION.md).

## Requirements

- Python 3.8+
- Node.js and npm (for running MCP servers)
- OpenAI API key

## License

This code is provided as-is with no warranty. Use at your own risk.