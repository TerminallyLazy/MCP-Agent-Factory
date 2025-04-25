"""
Lightweight implementation for creating and running agents with MCP integration.
"""
from dotenv import load_dotenv
import pathlib
import asyncio
import os

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

import sys
import pathlib
sys.path.append(str(pathlib.Path(__file__).parent.parent.resolve()))
from agents.mcp_client import MCPClient

# Load environment variables
load_dotenv()

def get_model(
    model_name=None, 
    base_url=None, 
    api_key=None
):
    """
    Create an OpenAI model for use with agents.
    
    Args:
        model_name: Model name (defaults to MODEL_CHOICE env var or gpt-4o-mini)
        base_url: Base URL (defaults to BASE_URL env var or https://api.openai.com/v1)
        api_key: API key (defaults to LLM_API_KEY or OPENAI_API_KEY env vars)
    
    Returns:
        Configured OpenAI model
    """
    # Get model name
    llm = model_name or os.getenv('MODEL_CHOICE') or os.getenv('MODEL_NAME', 'gpt-4o-mini')
    
    # Get base URL
    base_url = base_url or os.getenv('BASE_URL', 'https://api.openai.com/v1')
    
    # Get API key (check multiple env vars)
    api_key = api_key or os.getenv('LLM_API_KEY') or os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("API key not found in environment variables")

    return OpenAIModel(
        llm,
        base_url=base_url,
        api_key=api_key
    )

async def create_agent(
    config_path=None,
    model_name=None,
    base_url=None,
    api_key=None,
    system_prompt=None
):
    """
    Create an agent with MCP tool support.
    
    Args:
        config_path: Path to MCP config file (defaults to mcp_config.json in project root)
        model_name: Model name to use
        base_url: Base URL for API
        api_key: API key
        system_prompt: Optional system prompt for the agent
    
    Returns:
        Tuple of (MCP client, configured agent)
    """
    # Default config path if not provided
    if not config_path:
        # Get project root directory (where this script is located)
        script_dir = pathlib.Path(__file__).parent.parent.resolve()
        config_path = str(script_dir / "mcp_config.json")
    
    # Create MCP client and load servers
    client = MCPClient()
    client.load_servers(config_path)
    
    # Start client and get tools
    tools = await client.start()
    
    # Create agent with model and tools
    agent = Agent(
        model=get_model(model_name, base_url, api_key),
        tools=tools,
        system_prompt=system_prompt
    )
    
    return client, agent

async def run_interactive_session(
    config_path=None,
    model_name=None, 
    base_url=None, 
    api_key=None,
    system_prompt=None,
    exit_commands=('exit', 'quit', 'bye', 'goodbye')
):
    """
    Run an interactive session with an MCP-enabled agent.
    
    Args:
        config_path: Path to MCP config file
        model_name: Model name to use
        base_url: Base URL for API
        api_key: API key
        system_prompt: Optional system prompt for the agent
        exit_commands: Tuple of commands that will exit the session
    """
    try:
        # Create client and agent
        client, agent = await create_agent(
            config_path, 
            model_name, 
            base_url, 
            api_key,
            system_prompt
        )
        
        print("Agent ready. Type your questions or 'exit' to quit.")
        
        # Main interaction loop
        while True:
            # Get user input
            user_input = input("\n[You] ")
            
            # Check if user wants to exit
            if user_input.lower() in exit_commands:
                print("Goodbye!")
                break
            
            try:
                # Run the agent
                result = await agent.run(user_input)
                
                # Print response (handle different result formats)
                if hasattr(result, 'final_output'):
                    print('[Assistant] ', result.final_output)
                elif hasattr(result, 'output'):
                    print('[Assistant] ', result.output)
                elif hasattr(result, 'data'):
                    print('[Assistant] ', result.data)
                else:
                    print('[Assistant] ', result)
                    
            except Exception as e:
                print(f"Error: {e}")
    
    finally:
        # Clean up
        if 'client' in locals():
            await client.cleanup()