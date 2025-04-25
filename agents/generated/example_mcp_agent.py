#!/usr/bin/env python3
"""
Example MCP Agent that uses MCP tools.
"""
from dotenv import load_dotenv
import asyncio
import os
import pathlib
import sys
import json
import time
from datetime import datetime

# Load environment variables
load_dotenv()

# Define the path to the config file
SCRIPT_DIR = pathlib.Path(__file__).parent.parent.parent.resolve()
CONFIG_FILE = SCRIPT_DIR / "mcp_config.json"

# Since we're not actually running the real MCP client in this example
# We'll simulate some of its behavior for demonstration
class MockMCPClient:
    def __init__(self):
        self.servers = []
        self.tools = []
        
    def load_servers(self, config_path):
        print(f"[Mock] Loading server config from {config_path}")
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
                print(f"[Mock] Loaded config with {len(config.get('mcpServers', {}))} servers")
        except Exception as e:
            print(f"[Mock] Error loading config: {e}")
            
    async def start(self):
        # Simulate loading servers
        print(f"[Mock] Starting MCP client")
        await asyncio.sleep(1)  # Simulate network delay
        print(f"[Mock] MCP client started")
        
        # Return mock tools
        self.tools = [
            {"name": "file_search", "description": "Search for files"},
            {"name": "web_search", "description": "Search the web"},
            {"name": "read_file", "description": "Read a file's contents"}
        ]
        return self.tools
        
    async def cleanup(self):
        print(f"[Mock] Cleaning up MCP client")
        await asyncio.sleep(0.5)  # Simulate cleanup delay
        print(f"[Mock] Cleanup complete")

async def main():
    """Run the agent with a simulated MCP client."""
    print(f"Starting Example MCP Agent at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Python version: {sys.version}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Config file path: {CONFIG_FILE}")
    
    # Initialize client
    client = MockMCPClient()
    client.load_servers(str(CONFIG_FILE))
    
    try:
        # Start client
        print("\nStarting MCP client...")
        tools = await client.start()
        
        # Print available tools
        print(f"\nAvailable tools ({len(tools)}):")
        for tool in tools:
            print(f"- {tool['name']}: {tool['description']}")
        
        # Simulate interactive chat
        print("\nEntering interactive mode. Type 'exit' to quit.")
        
        for i in range(3):  # Just do a few messages for the demo
            # Wait for user input (simulated here)
            await asyncio.sleep(1)
            
            # Simulate user input
            if i == 0:
                user_input = "What tools are available?"
                print(f"\nYou: {user_input}")
                await asyncio.sleep(1)
                print(f"Agent: I have {len(tools)} tools available: file search, web search, and file reading.")
            elif i == 1:
                user_input = "Search for files in the current directory"
                print(f"\nYou: {user_input}")
                await asyncio.sleep(1.5)
                print(f"Agent: I'm searching files in the current directory...")
                await asyncio.sleep(1)
                print(f"Agent: Found several Python files, including the agent implementation files.")
            else:
                user_input = "exit"
                print(f"\nYou: {user_input}")
                print(f"Agent: Goodbye! Shutting down.")
                break
    
    finally:
        # Clean up
        print("\nCleaning up resources...")
        await client.cleanup()
        print("Agent shut down successfully.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nAgent process interrupted by user.")
    except Exception as e:
        print(f"\nError running agent: {e}")
        import traceback
        traceback.print_exc()