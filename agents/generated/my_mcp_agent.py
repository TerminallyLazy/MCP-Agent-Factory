from dotenv import load_dotenv
import asyncio
import os
import sys
import pathlib
import json

# Add project root to python path to find modules
project_root = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))
# Change working directory to project root
os.chdir(str(project_root))

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

# Import the MCP client using the absolute path
from agents.mcp_client import MCPClient

# Load environment variables
load_dotenv()

# Define the path to the config file - make sure it points to the project root
SCRIPT_DIR = pathlib.Path(__file__).parent.parent.parent
CONFIG_FILE = SCRIPT_DIR / "mcp_config.json"

print(f"Starting agent... Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")
print(f"Script directory: {SCRIPT_DIR}")
print(f"Config file: {CONFIG_FILE}")

# Server configuration
async def configure_client():
    # Setup the MCP client and load servers
    print("Initializing MCP client...")
    client = MCPClient()
    client.load_servers(str(CONFIG_FILE))

    # Start the client and get tools
    print("Starting MCP client and loading tools...")
    tools = await client.start()
    print(f"Loaded {len(tools)} tools")

    # Count tools by server type
    server_tools = {}
    try:
        with open(str(CONFIG_FILE), 'r') as f:
            config = json.load(f)
            print(f"Config loaded with {len(config.get('mcpServers', {}))} servers")
            for server_name in config.get('mcpServers', {}):
                server_tools[server_name] = 0

        for tool in tools:
            # This assumes a naming convention where tool names include the server type
            for server_name in server_tools:
                if server_name.lower() in tool.name.lower():
                    server_tools[server_name] += 1

        # Report on available tools
        print("\nMCP Servers and Tool Counts:")
        for server, count in server_tools.items():
            print(f"- {server}: {count} tools")
    except Exception as e:
        print(f"Error analyzing tools: {e}")

    return client, tools

async def main():
    try:
        # Configure the client and get tools
        client, tools = await configure_client()

        try:
            # Create the model
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                print("WARNING: OPENAI_API_KEY environment variable not set")
                return

            model_name = os.getenv('MODEL_NAME', 'gpt-4o-mini')
            print(f"Using model: {model_name}")

            # Ensure OPENAI_API_KEY is set in the environment, Pydantic-AI uses it directly
            if not api_key:
                print("ERROR: OPENAI_API_KEY environment variable is required but not set.")
                # Optionally raise an error or exit if the key is mandatory
                # raise ValueError("OPENAI_API_KEY must be set in the environment.")
                # Or handle the missing key case appropriately, maybe by disabling the model
                return # Exit main if key is missing

            # Do NOT pass api_key directly to OpenAIModel constructor
            model = OpenAIModel(
                model_name,
            )

            # Create the agent with a system prompt that understands multiple servers
            system_prompt = """
            You are an assistant with access to multiple MCP servers, each providing different
            capabilities. You can use tools from file system access, web search,
            memory storage, and web fetching. Choose the appropriate tools based on the
            user's request, and combine capabilities when needed.
            """

            print("Creating agent with MCP tools...")
            agent = Agent(model=model, tools=tools, system_prompt=system_prompt)

            # Process user messages in a loop
            print("\nMulti-Server Agent is ready. Enter 'quit' to exit.")
            while True:
                user_input = input("\nYou: ")
                if user_input.lower() in ["exit", "quit", "bye"]:
                    break

                # Run the agent
                print("Running agent...")
                result = await agent.run(user_input)
                # Print debug information about the result object
                print(f"\nResult type: {type(result)}")
                print(f"Result dir: {dir(result)}")

                # The result object might have different attributes depending on the version
                # Try different attribute names that might contain the output
                if hasattr(result, 'response'):
                    print(f"\nAgent: {result.response}")
                elif hasattr(result, 'content'):
                    print(f"\nAgent: {result.content}")
                elif hasattr(result, 'message'):
                    print(f"\nAgent: {result.message}")
                elif hasattr(result, 'text'):
                    print(f"\nAgent: {result.text}")
                elif hasattr(result, 'assistant_response'):
                    print(f"\nAgent: {result.assistant_response}")
                else:
                    # If none of the expected attributes are found, print the entire result
                    print(f"\nAgent result: {result}")

                # Try to access the result as a dictionary
                try:
                    if hasattr(result, '__dict__'):
                        print(f"\nResult __dict__: {result.__dict__}")
                except Exception as e:
                    print(f"Error accessing __dict__: {e}")
        finally:
            # Clean up resources
            print("Cleaning up resources...")
            # Uncomment the following line if cleanup is needed
            # await client.cleanup()
    except Exception as e:
        print(f"Error in main: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nAgent execution interrupted by user")
    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()