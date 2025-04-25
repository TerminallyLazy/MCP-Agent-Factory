from dotenv import load_dotenv
import asyncio
import json
import os
import pathlib

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

from agents.mcp_client import MCPClient

# Load environment variables
load_dotenv()

# Define the path to the config file
SCRIPT_DIR = pathlib.Path(__file__).parent.resolve()
CONFIG_FILE = SCRIPT_DIR / "mcp_config.json"

async def list_tools():
    # Setup the MCP client and load tools
    client = MCPClient()
    client.load_servers(str(CONFIG_FILE))
    tools = await client.start()
    
    # Print tool information
    print(f"\nFound {len(tools)} MCP tools:\n")
    for tool in tools:
        print(f"- {tool.name}: {tool.description}")
    
    await client.cleanup()

async def run_agent():
    # Create an agent specialized in tool exploration
    client = MCPClient()
    client.load_servers(str(CONFIG_FILE))
    tools = await client.start()
    
    # Create a specialized model for tool exploration
    model = OpenAIModel(
        os.getenv('MODEL_NAME', 'gpt-4o'),
        api_key=os.getenv('OPENAI_API_KEY'),
    )
    
    # Create the agent with the model and tools
    system_prompt = """
    You are a Tool Developer Assistant. Your job is to help the user understand, 
    test, and utilize MCP tools. When the user asks about tools, provide detailed 
    information about their capabilities. When the user wants to test a tool, help 
    them craft appropriate inputs and explain the outputs.
    """
    
    agent = Agent(model=model, tools=tools, system_prompt=system_prompt)
    
    # Process user messages in a loop
    try:
        print("Tool Developer Agent is ready. Enter 'quit' to exit.")
        while True:
            user_input = input("\nYou: ")
            if user_input.lower() in ["exit", "quit", "bye"]:
                break
                
            # Run the agent
            result = await agent.run(user_input)
            print(f"\nAgent: {result.output}")
    finally:
        # Clean up resources
        await client.cleanup()

if __name__ == "__main__":
    # First list available tools, then run the interactive agent
    asyncio.run(list_tools())
    asyncio.run(run_agent())
