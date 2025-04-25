# MCP Agent Factory

This directory contains the necessary files to add and use MCP servers as well as build, configure, and deploy MCP Tool using Agents. 
 - MCP allows AI agents to access external tools and capabilities like file system access, web search, and more.

## Directory Structure

```
mcp-integration/
├── agents/                  # Agent implementation
│   ├── __init__.py          # Agent class definition
│   ├── lightweight_agent.py # Lightweight agent implementation
│   ├── mcp/                 # MCP client implementation
│   │   ├── __init__.py
│   │   ├── agent_factory.py # Factory for creating MCP agents
│   │   ├── client.py        # MCP client implementation
│   └── tools/               # Tool implementations
│       └── __init__.py
├── docs/                    # Documentation
│   └── MCP_INTEGRATION.md   # Integration guide
├── example.py               # Example usage
├── simple_agent.py          # Simple lightweight agent example
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
3. **Lightweight Agent**: A simplified agent implementation for direct control

### Factory Approach
You can create advanced custom agents using the `create_mcp_agent` function in `agents/mcp/agent_factory.py`.

### Lightweight Approach
For a simpler implementation with more direct control, use the lightweight approach:

```python
from agents.lightweight_agent import create_agent

async def main():
    # Create a lightweight agent
    client, agent = await create_agent(
        config_path="path/to/config.json",
        model_name="gpt-4o-mini"
    )
    
    # Run a query
    result = await agent.run("What can you do?")
    print(result.output)
    
    # Clean up
    await client.cleanup()
```

You can also use the interactive session:

```python
from agents.lightweight_agent import run_interactive_session

async def main():
    await run_interactive_session(
        config_path="path/to/config.json",
        system_prompt="You are a helpful assistant."
    )
```

Or run the included example script:
```bash
python simple_agent.py --model gpt-4o
# Or for a single query:
python simple_agent.py --query "What are MCP tools?" --model gpt-4o-mini
```

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
