"""
Example script demonstrating how to use the MCP integration.
"""
import asyncio
import os
import argparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import MCP agent factory
from agents.mcp.agent_factory import (
    get_general_assistant_agent, 
    get_tool_listing_agent,
    run_with_cleanup
)

async def run_tool_listing_agent():
    """
    Run an agent that lists and demonstrates available tools.
    """
    print("Creating Tool Listing Agent...")
    
    try:
        # Create a tool listing agent
        client, agent = await get_tool_listing_agent()
        
        # Run the agent with a prompt to list tools
        print("\nAsking agent to list available tools...\n")
        result = await run_with_cleanup(
            client, 
            agent, 
            "Please list all the tools you have available and explain what each one does."
        )
        
        # Print the result
        print("\nAgent response:")
        print("-" * 80)
        print(result["text"])
        print("-" * 80)
        
    except Exception as e:
        print(f"Error: {e}")

async def run_general_assistant():
    """
    Run a general assistant agent with MCP tools.
    """
    print("Creating General Assistant Agent...")
    
    try:
        # Create an MCP-enabled agent
        client, agent = await get_general_assistant_agent()
        
        # Run the agent with a prompt
        print("\nSending prompt to agent...\n")
        result = await run_with_cleanup(
            client, 
            agent, 
            "What's the current date and time? Can you also tell me about the Model Context Protocol?"
        )
        
        # Print the result
        print("\nAgent response:")
        print("-" * 80)
        print(result["text"])
        print("-" * 80)
        
    except Exception as e:
        print(f"Error: {e}")

async def main():
    """
    Main function to demonstrate MCP integration.
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="MCP Integration Example")
    parser.add_argument("--mode", choices=["general", "tools"], default="general",
                        help="Mode to run: 'general' for general assistant, 'tools' to list tools")
    args = parser.parse_args()
    
    # Check if OpenAI API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable is not set.")
        print("Please set it with: export OPENAI_API_KEY=your_api_key_here")
        return

    # Run the selected mode
    if args.mode == "tools":
        await run_tool_listing_agent()
    else:
        await run_general_assistant()

if __name__ == "__main__":
    # Run the main function
    asyncio.run(main())