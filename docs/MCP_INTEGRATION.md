# MCP Integration Guide

This guide explains how to integrate the Model Context Protocol (MCP) into your project.

## Overview

The Model Context Protocol (MCP) is a standard for connecting AI models to external tools and capabilities. This integration provides a robust way to extend your AI agents with various tools like file system access, web search, and more.

## Dependencies

All necessary MCP packages are included in the `requirements.txt` file:

```
pydantic-ai>=0.1.1
mcp>=0.1.0
griffe>=0.38.1
logfire>=0.5.0
```

You'll also need Node.js and npm installed to run the MCP servers.

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install Node.js dependencies (these will be installed on-demand by the MCP client):
   ```bash
   # These will be installed automatically when needed
   # @modelcontextprotocol/server-filesystem
   # @modelcontextprotocol/server-brave-search
   # @modelcontextprotocol/server-fetch
   # @modelcontextprotocol/server-memory
   ```

3. Configure your MCP servers in `mcp_config.json`:
   ```json
   {
     "mcpServers": {
       "filesystem": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/lazy/Documents", "/home/lazy/Downloads", "/home/lazy/Projects"],
         "env": {}
       },
       "brave-search": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-brave-search"],
         "env": {
           "BRAVE_API_KEY": "YOUR_BRAVE_API_KEY_HERE"
         }
       }
     }
   }
   ```

4. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

## Usage

Here's a simple example of how to use the MCP integration:

```python
import asyncio
import os
from dotenv import load_dotenv
from agents.mcp.agent_factory import get_general_assistant_agent, run_with_cleanup

# Load environment variables
load_dotenv()

async def main():
    # Create an MCP-enabled agent
    client, agent = await get_general_assistant_agent()
    
    try:
        # Run the agent with a prompt
        result = await run_with_cleanup(
            client, 
            agent, 
            "What's the weather like in New York City today?"
        )
        
        # Print the result
        print(result["text"])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Available MCP Servers

1. **Filesystem Server**: Provides access to the file system
   - Package: `@modelcontextprotocol/server-filesystem`
   - Configuration: Specify allowed directories
   - Example tools: `read_file`, `write_file`, `list_directory`

2. **Brave Search Server**: Provides web search capabilities
   - Package: `@modelcontextprotocol/server-brave-search`
   - Configuration: Requires a Brave API key
   - Example tools: `brave_web_search`, `brave_local_search`

3. **Fetch Server**: Provides web fetching capabilities
   - Package: `@modelcontextprotocol/server-fetch`
   - Configuration: No additional configuration needed
   - Example tools: `web_fetch`

4. **Memory Server**: Provides memory capabilities for the agent
   - Package: `@modelcontextprotocol/server-memory`
   - Configuration: No additional configuration needed
   - Example tools: `remember`

## Architecture

The MCP integration consists of the following components:

1. **MCPClient**: Manages connections to one or more MCP servers
   - Loads configurations from a JSON file
   - Converts MCP tools to Pydantic AI tools
   - Handles proper cleanup of resources

2. **Agent Factory**: Provides functions to create different types of agents
   - Integration with the OpenAI API
   - Utilities for running agents with proper cleanup

## Troubleshooting

If you encounter issues with the MCP integration, check the following:

### Common Issues

1. **500 Server Error**: This often indicates an issue with the MCP server initialization or tool execution.
   - Check the server logs for detailed error messages
   - Verify that the MCP server packages are installed correctly
   - Make sure the configuration in `mcp_config.json` is correct

2. **Missing Tools**: If the agent doesn't have access to expected tools:
   - Check that the MCP servers are properly configured
   - Verify that the server is starting correctly (look for initialization logs)
   - Make sure the tool is provided by one of the configured servers

3. **Node.js/npm Issues**: MCP servers require Node.js and npm.
   - Install Node.js and npm if not already installed
   - Make sure they're in your PATH
   - Try running `npx -y @modelcontextprotocol/server-filesystem` manually to test

4. **API Key Issues**: Some servers require API keys.
   - Check that your Brave API key is set correctly for web search
   - Verify that your OpenAI API key is set correctly

### Debugging

1. Enable more detailed logging by setting the log level to DEBUG:
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

2. Check the logs for error messages from the MCP client and servers.

3. Try running each server individually to isolate issues:
   ```bash
   npx -y @modelcontextprotocol/server-filesystem /path/to/directory
   ```

4. Verify that the MCP tools are being properly converted to Pydantic AI tools by adding debug logging.

### Fixing Common Errors

1. **"Command not found" errors**: Make sure Node.js and npm are installed and in your PATH.

2. **Permission errors**: Check that the directories specified in the filesystem server configuration are accessible.

3. **API key errors**: Verify that your API keys are correct and properly formatted.

4. **Timeout errors**: Increase the timeout for MCP server initialization if needed.

## Advanced Configuration

For more advanced configuration options, refer to the MCP documentation:
- [MCP Documentation](https://modelcontextprotocol.io/quickstart/server)
- [Pydantic AI Documentation](https://github.com/pydantic/pydantic-ai)

### Custom Tool Integration

You can create custom tools and integrate them with MCP:

1. Create a custom MCP server
2. Add it to your `mcp_config.json`
3. The tools will be automatically available to your agents

### Performance Optimization

For better performance:

1. Only include the MCP servers you need
2. Use appropriate search context sizes based on your needs
3. Consider using a more powerful OpenAI model for complex tasks