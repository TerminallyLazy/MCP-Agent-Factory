import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      systemPrompt, 
      modelName, 
      serverNames, 
      agentName,
      description = ""
    } = body;

    if (!systemPrompt || !modelName || !serverNames || !agentName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get MCP_DOCS from the public folder or use preset content
    let mcp_docs = '';
    try {
      // Try to read from file path
      const filePath = path.join(process.cwd(), 'public', 'lls-full.txt');
      mcp_docs = readFileSync(filePath, 'utf8');
    } catch (error) {
      // Use a shorter version for the demo
      mcp_docs = `
Model Context Protocol (MCP)
===========================

MCP is a standard protocol for connecting LLMs with external tools and capabilities.

Core Concepts:
1. Servers: Programs that provide tools via MCP
2. Tools: Functions that LLMs can call to perform actions
3. Clients: Software that connects LLMs to MCP servers

Python Implementation:
---------------------
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from pydantic_ai import Agent, Tool as PydanticTool
from pydantic_ai.tools import ToolDefinition

# Initialize MCP client
client = MCPClient()
client.load_servers("mcp_config.json")
tools = await client.start()

# Create an agent with the tools
agent = Agent(model=model, tools=tools)
result = await agent.run("Query")

# Clean up
await client.cleanup()
`;
    }

    // Format server names for the prompt
    const serverList = serverNames.join(', ');

    // Create the prompt for code generation
    const prompt = `You are an expert Python developer specializing in AI agents.
    
Task: Generate Python code for an MCP-enabled agent with the following specifications:

Agent Name: ${agentName}
Description: ${description || 'A custom MCP agent'}
Model: ${modelName}
MCP Servers: ${serverList}

System Prompt:
"""
${systemPrompt}
"""

Requirements:
1. Use the agents.mcp_client.MCPClient class
2. Include proper initialization, execution, and cleanup
3. Follow async/await patterns for all MCP operations
4. Include error handling and resource cleanup
5. Make the code production-ready and well-documented
6. IMPORTANT: Add sys.path.append to make imports work when running the script directly
7. Use absolute paths for the config file
8. Include comprehensive debugging output and error handling
9. Use try/except blocks to handle errors gracefully

Here's documentation about MCP:
${mcp_docs}

Return only the Python code with no additional explanations, but use the following template for imports and path setup:

\`\`\`python
from dotenv import load_dotenv
import asyncio
import os
import sys
import pathlib
import json

# Add parent directory to python path to find modules
sys.path.append(str(pathlib.Path(__file__).parent.parent.parent))

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
\`\`\`

Continue from there with the rest of the implementation.`;

    // Call the OpenAI API to generate code
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use a capable model for code generation
      messages: [
        { 
          role: "system", 
          content: "You are an AI assistant specialized in generating high-quality Python code for AI agents. Generate clear, well-documented code without additional commentary." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    });

    // Extract the generated code
    const generatedCode = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      code: generatedCode,
      message: 'Agent code generated successfully'
    });
  } catch (error) {
    console.error('Error generating agent code:', error);
    return NextResponse.json(
      { error: 'Failed to generate agent code' },
      { status: 500 }
    );
  }
}