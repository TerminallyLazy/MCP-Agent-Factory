"""
Factory for creating MCP-enabled agents.
"""
import os
import pathlib
import logging
from typing import Tuple, Dict, Any, List, Optional

from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIModel

# Use the real MCP client
from .client import MCPClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp_agent_factory")

# Get the MCP config path
SCRIPT_DIR = pathlib.Path(__file__).parent.resolve()
CONFIG_PATH = str(SCRIPT_DIR.parent.parent / "mcp_config.json")

def get_openai_model() -> OpenAIModel:
    """
    Create an OpenAI model instance for use with agents.

    Returns:
        Configured OpenAI model

    Raises:
        ValueError: If required API key is missing
    """
    # Get API key and model name from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")

    model_name = os.getenv("MODEL_NAME", "gpt-4.1")

    logger.info(f"Creating OpenAI model with model_name={model_name}")

    # Create a simple model with just the model name
    # The OpenAI API key should be set in the environment
    return OpenAIModel(model_name)

async def create_mcp_agent(
    system_prompt: str,
    model_name: Optional[str] = None,
    use_web_search: bool = True,
    search_context_size: str = "medium",
    user_location: Optional[Dict[str, str]] = None
) -> Tuple[MCPClient, Agent]:
    """
    Create an agent with MCP tool support and optional web search.

    Args:
        system_prompt: The system prompt for the agent
        model_name: Optional model name override
        use_web_search: Whether to enable web search capability
        search_context_size: Size of search context ("low", "medium", or "high")
        user_location: Optional user location for search context

    Returns:
        Tuple of (MCP client, configured agent)
    """
    # Create and start MCP client
    logger.info(f"Creating MCP client with config path: {CONFIG_PATH}")
    client = MCPClient(CONFIG_PATH)
    
    try:
        # Start the client and get tools
        logger.info("Starting MCP client and getting tools")
        mcp_tools = await client.start()
        logger.info(f"Got {len(mcp_tools)} MCP tools")
        
        # Override model name if provided
        model = get_openai_model()
        if model_name:
            model.model = model_name
            logger.info(f"Overriding model name to: {model_name}")

        # Create the agent with MCP tools
        logger.info("Creating agent with MCP tools")
        agent = Agent(
            model=model,
            system_prompt=system_prompt,
            tools=mcp_tools
        )

        return client, agent
    except Exception as e:
        # Clean up the client if there's an error
        logger.error(f"Error creating MCP agent: {e}")
        await client.cleanup()
        raise

async def get_general_assistant_agent() -> Tuple[MCPClient, Agent]:
    """
    Create a General Assistant Agent with MCP integration.

    Returns:
        Tuple of (MCP client, configured agent)
    """
    system_prompt = """
    You are a helpful AI assistant with access to various tools through the Model Context Protocol (MCP).
    You can use these tools to help users with their tasks, answer questions, and provide assistance.
    
    When using tools:
    1. Choose the most appropriate tool for the task
    2. Use tools efficiently and effectively
    3. Explain your reasoning and process
    4. Provide clear and concise responses
    
    Your goal is to be as helpful as possible while using the available tools to their full potential.
    """

    return await create_mcp_agent(
        system_prompt=system_prompt,
        search_context_size="medium"
    )

async def get_tool_listing_agent() -> Tuple[MCPClient, Agent]:
    """
    Create an agent specifically for listing and demonstrating available tools.

    Returns:
        Tuple of (MCP client, configured agent)
    """
    system_prompt = """
    You are a Tool Demonstration Agent. Your primary purpose is to help users understand
    the tools available to you through the Model Context Protocol (MCP).
    
    When asked about your tools:
    1. List all available tools with their names and descriptions
    2. Explain what each tool does and how it can be used
    3. Provide examples of how to use each tool effectively
    4. If asked to demonstrate a specific tool, use it to show its capabilities
    
    Your goal is to clearly explain the capabilities provided by your tools.
    """

    return await create_mcp_agent(
        system_prompt=system_prompt,
        search_context_size="low"  # Lower context size since we're just listing tools
    )

async def run_agent(agent: Agent, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Run an MCP agent with the given prompt and context.

    Args:
        agent: The agent to run
        prompt: The prompt to send to the agent
        context: Optional context for the agent

    Returns:
        The agent's output
    """
    try:
        # Run the agent - try different parameter combinations
        try:
            # First try with context parameter
            logger.info(f"Running agent with prompt: {prompt}")
            result = await agent.run(prompt, context=context or {})
        except TypeError as e:
            if "context" in str(e):
                # If that fails, try without context parameter
                logger.info("Falling back to agent.run without context parameter")
                result = await agent.run(prompt)
            else:
                # Re-raise if it's a different TypeError
                raise

        # Format the result - prioritize newer properties over deprecated ones
        if hasattr(result, "final_output"):
            text = result.final_output
        elif hasattr(result, "output"):
            text = result.output
        elif hasattr(result, "data"):  # Fallback for backward compatibility
            logger.warning("Using deprecated 'data' property. Update to use 'output' instead.")
            text = result.data
        else:
            text = str(result)

        # Get data - prioritize newer properties over deprecated ones
        if hasattr(result, "model_dump") and callable(result.model_dump):
            data = result.model_dump()
        elif hasattr(result, "output") and isinstance(result.output, dict):
            data = result.output
        elif hasattr(result, "data") and isinstance(result.data, dict):  # Fallback for backward compatibility
            logger.warning("Using deprecated 'data' property. Update to use 'output' instead.")
            data = result.data
        else:
            data = {}

        return {
            "text": text,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error running agent: {e}")
        return {
            "text": f"I'm sorry, but I encountered an error: {str(e)}",
            "data": {}
        }

async def run_with_cleanup(client: MCPClient, agent: Agent, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Run an agent and ensure the MCP client is cleaned up afterward.

    Args:
        client: The MCP client to clean up
        agent: The agent to run
        prompt: The prompt to send to the agent
        context: Optional context for the agent

    Returns:
        The agent's output
    """
    try:
        return await run_agent(agent, prompt, context)
    finally:
        logger.info("Cleaning up MCP client")
        await client.cleanup()