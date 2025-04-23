"""
MCP client implementation for integrating Model Context Protocol.
This client handles the case when MCP servers are not available.
"""
import os
import json
import asyncio
import logging
import shutil
from typing import Dict, List, Any, Optional
from contextlib import AsyncExitStack

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("mcp_client")

try:
    # Try to import MCP dependencies
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    from mcp.types import Tool as MCPTool

    # Try to import Pydantic AI dependencies
    from pydantic_ai import RunContext, Tool
    from pydantic_ai.tools import ToolDefinition
    
    MCP_AVAILABLE = True
    logger.info("MCP dependencies are available")
except ImportError:
    MCP_AVAILABLE = False
    logger.warning("MCP dependencies are not available. Using fallback mode.")

class MCPClient:
    """
    Manages connections to one or more MCP servers based on config.json.
    Handles the case when MCP servers are not available.
    """
    def __init__(self, config_path: str):
        """
        Initialize the MCP client.
        
        Args:
            config_path: Path to the configuration file
        """
        self.config_path = config_path
        self.servers = []
        self.tools = []
        self.exit_stack = AsyncExitStack()
        
        # Check if MCP is available
        if not MCP_AVAILABLE:
            logger.warning("MCP is not available. Using fallback mode.")
            return
            
        # Load configuration
        try:
            with open(config_path, "r") as f:
                self.config = json.load(f)
                
            # Create server instances
            self.servers = [
                MCPServer(name, config) 
                for name, config in self.config.get("mcpServers", {}).items()
            ]
            logger.info(f"Loaded {len(self.servers)} MCP servers from config")
        except Exception as e:
            logger.error(f"Error loading MCP configuration: {e}")
    
    async def start(self) -> List:
        """
        Start the MCP client and return the tools.
        
        Returns:
            A list of tools
        """
        # If MCP is not available, return an empty list
        if not MCP_AVAILABLE:
            logger.warning("MCP is not available. Returning empty tools list.")
            return []
            
        # Start each server and collect tools
        self.tools = []
        for server in self.servers:
            try:
                logger.info(f"Initializing MCP server: {server.name}")
                await server.initialize()
                tools = await server.create_tools()
                logger.info(f"Server {server.name} provided {len(tools)} tools")
                self.tools.extend(tools)
            except Exception as e:
                logger.error(f"Error starting MCP server {server.name}: {e}")
                
        logger.info(f"Total MCP tools available: {len(self.tools)}")
        return self.tools
    
    async def cleanup(self) -> None:
        """
        Clean up resources.
        """
        # If MCP is not available, do nothing
        if not MCP_AVAILABLE:
            return
            
        # Clean up each server
        for server in self.servers:
            try:
                await server.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up MCP server: {e}")
                
        # Close the exit stack
        try:
            await self.exit_stack.aclose()
        except Exception as e:
            logger.error(f"Error closing exit stack: {e}")

# Only define MCPServer if MCP is available
if MCP_AVAILABLE:
    class MCPServer:
        """
        Manages a connection to a single MCP server and its tools.
        """
        def __init__(self, name: str, config: Dict[str, Any]):
            """
            Initialize a server connection.
            
            Args:
                name: Name of the server
                config: Server configuration
            """
            self.name = name
            self.config = config
            self.session = None
            self.exit_stack = AsyncExitStack()
            self._cleanup_lock = asyncio.Lock()
        
        async def initialize(self) -> None:
            """
            Initialize and connect to the MCP server.
            """
            # Get command (handle npx specially)
            command = self.config.get("command")
            if command == "npx":
                command = shutil.which("npx")
                if not command:
                    raise ValueError("npx command not found. Please install Node.js and npm.")
            
            # Get arguments and environment
            args = self.config.get("args", [])
            env = self.config.get("env")
            
            try:
                # Create server parameters
                server_params = StdioServerParameters(
                    command=command,
                    args=args,
                    env=env
                )
                
                # Start the server process
                stdio_transport = await self.exit_stack.enter_async_context(
                    stdio_client(server_params)
                )
                
                # Create and initialize session
                read, write = stdio_transport
                session = await self.exit_stack.enter_async_context(
                    ClientSession(read, write)
                )
                await session.initialize()
                
                self.session = session
                logger.info(f"Successfully initialized MCP server: {self.name}")
            except Exception as e:
                logger.error(f"Failed to initialize MCP server {self.name}: {e}")
                await self.cleanup()
                raise
        
        async def create_tools(self) -> List:
            """
            Create tools from the MCP server.
            
            Returns:
                A list of tools
            """
            # Get tools from the server
            try:
                tools_response = await self.session.list_tools()
                mcp_tools = tools_response.tools
                
                # Convert MCP tools to Pydantic AI tools
                return [self._create_tool(tool) for tool in mcp_tools]
            except Exception as e:
                logger.error(f"Error getting tools from server {self.name}: {e}")
                return []
        
        def _create_tool(self, mcp_tool: MCPTool):
            """
            Create a Pydantic AI tool from an MCP tool.
            
            Args:
                mcp_tool: The MCP tool
                
            Returns:
                A Pydantic AI tool
            """
            # Create the execute function
            async def execute_tool(**kwargs):
                try:
                    return await self.session.call_tool(mcp_tool.name, arguments=kwargs)
                except Exception as e:
                    logger.error(f"Error calling tool {mcp_tool.name}: {e}")
                    return {"error": str(e)}
            
            # Create the prepare function
            async def prepare_tool(ctx: RunContext, tool_def: ToolDefinition):
                tool_def.parameters_json_schema = mcp_tool.inputSchema
                return tool_def
            
            # Create and return the tool
            return Tool(
                execute_tool,
                name=mcp_tool.name,
                description=mcp_tool.description or f"MCP tool from server {self.name}",
                takes_ctx=False,
                prepare=prepare_tool
            )
        
        async def cleanup(self) -> None:
            """
            Clean up server resources.
            """
            async with self._cleanup_lock:
                try:
                    await self.exit_stack.aclose()
                    self.session = None
                    logger.info(f"Cleaned up MCP server: {self.name}")
                except Exception as e:
                    logger.error(f"Error during cleanup of server {self.name}: {e}")