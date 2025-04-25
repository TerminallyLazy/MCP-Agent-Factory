"use client";

import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Code,
  Cpu,
  Pencil,
  Play,
  Plus,
  Save,
  Sparkles,
  Wand,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMCP } from "@/components/Providers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentTemplate {
  name: string;
  description: string;
  code: string;
}

const DEFAULT_TEMPLATES: AgentTemplate[] = [
  {
    name: "Simple Chat",
    description: "Basic chat agent with MCP tools",
    code: `from dotenv import load_dotenv
import asyncio
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

async def chat():
    # Setup the MCP client and load tools
    client = MCPClient()
    client.load_servers(str(CONFIG_FILE))
    tools = await client.start()
    
    # Create the OpenAI model
    model = OpenAIModel(
        os.getenv('MODEL_NAME', 'gpt-4o-mini'),
        api_key=os.getenv('OPENAI_API_KEY'),
    )
    
    # Create the agent with the model and tools
    agent = Agent(model=model, tools=tools)
    
    print("\\nMulti-Server Agent is ready. Enter 'quit' to exit.")
    while True:
        user_input = input("\\nYou: ")
        if user_input.lower() in ["exit", "quit", "bye"]:
            break

        # Run the agent
        print("Running agent...")
        result = await agent.run(user_input)
        # Print debug information about the result object
        print(f"\\nResult type: {type(result)}")
        print(f"\\nResult dir: {dir(result)}")

        # The result object might have different attributes depending on the version
        # Try different attribute names that might contain the output
        if hasattr(result, 'response'):
            print(f"\\nAgent: {result.response}")
        elif hasattr(result, 'content'):
            print(f"\\nAgent: {result.content}")
        elif hasattr(result, 'message'):
            print(f"\\nAgent: {result.message}")
        elif hasattr(result, 'text'):
            print(f"\\nAgent: {result.text}")
        elif hasattr(result, 'assistant_response'):
            print(f"\\nAgent: {result.assistant_response}")
        else:
            # If none of the expected attributes are found, print the entire result
            print(f"\\nAgent result: {result}")

        # Try to access the result as a dictionary
        try:
            if hasattr(result, '__dict__'):
                print(f"\\nResult __dict__: {result.__dict__}")
        except Exception as e:
            print(f"\\nError accessing __dict__: {e}")
    finally:
        # Clean up resources
        print("Cleaning up resources...")
        # Uncomment the following line if cleanup is needed
        # await client.cleanup()
  except Exception as e:
    print(f"\\nError in main: {e}")
    import traceback
    traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
`
  },
  {
    name: "Tool Developer",
    description: "Agent for exploring and testing MCP tools",
    code: `from dotenv import load_dotenv
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
    print(f"\\nFound {len(tools)} MCP tools:\\n")
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
            user_input = input("\\nYou: ")
            if user_input.lower() in ["exit", "quit", "bye"]:
                break
                
                # Run the agent
                print("Running agent...")
                result = await agent.run(user_input)
                # Print debug information about the result object
                print(f"\\nResult type: {type(result)}")
                print(f"\\nResult dir: {dir(result)}")

                # The result object might have different attributes depending on the version
                # Try different attribute names that might contain the output
                if hasattr(result, 'response'):
                    print(f"\\nAgent: {result.response}")
                elif hasattr(result, 'content'):
                    print(f"\\nAgent: {result.content}")
                elif hasattr(result, 'message'):
                    print(f"\\nAgent: {result.message}")
                elif hasattr(result, 'text'):
                    print(f"\\nAgent: {result.text}")
                elif hasattr(result, 'assistant_response'):
                    print(f"\\nAgent: {result.assistant_response}")
                else:
                    # If none of the expected attributes are found, print the entire result
                    print(f"\\nAgent result: {result}")

                # Try to access the result as a dictionary
                try:
                    if hasattr(result, '__dict__'):
                        print(f"\\nResult __dict__: {result.__dict__}")
                except Exception as e:
                    print(f"\\nError accessing __dict__: {e}")
        finally:
            # Clean up resources
            print("Cleaning up resources...")
            # Uncomment the following line if cleanup is needed
            # await client.cleanup()
    except Exception as e:
        print(f"\\nError in main: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # First list available tools, then run the interactive agent
    asyncio.run(list_tools())
    asyncio.run(main())
`
  },
  {
    name: "Multi-Server Agent",
    description: "Agent that uses multiple MCP servers",
    code: `from dotenv import load_dotenv
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
        print("\\nMCP Servers and Tool Counts:")
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
            print("\\nMulti-Server Agent is ready. Enter 'quit' to exit.")
            while True:
                user_input = input("\\nYou: ")
                if user_input.lower() in ["exit", "quit", "bye"]:
                    break

                # Run the agent
                print("Running agent...")
                result = await agent.run(user_input)
                # Print debug information about the result object
                print(f"\\nResult type: {type(result)}")
                print(f"\\nResult dir: {dir(result)}")

                # The result object might have different attributes depending on the version
                # Try different attribute names that might contain the output
                if hasattr(result, 'response'):
                    print(f"\\nAgent: {result.response}")
                elif hasattr(result, 'content'):
                    print(f"\\nAgent: {result.content}")
                elif hasattr(result, 'message'):
                    print(f"\\nAgent: {result.message}")
                elif hasattr(result, 'text'):
                    print(f"\\nAgent: {result.text}")
                elif hasattr(result, 'assistant_response'):
                    print(f"\\nAgent: {result.assistant_response}")
                else:
                    # If none of the expected attributes are found, print the entire result
                    print(f"\\nAgent result: {result}")

                # Try to access the result as a dictionary
                try:
                    if hasattr(result, '__dict__'):
                        print(f"\\nResult __dict__: {result.__dict__}")
                except Exception as e:
                    print(f"\\nError accessing __dict__: {e}")
        finally:
            # Clean up resources
            print("Cleaning up resources...")
            # Uncomment the following line if cleanup is needed
            # await client.cleanup()
    except Exception as e:
        print(f"\\nError in main: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\nAgent execution interrupted by user")
    except Exception as e:
        print(f"\\nFatal error: {e}")
        import traceback
        traceback.print_exc()
`
  }
];

interface AgentBuilderProps {
  onAgentCreated?: () => void;
}

export function AgentBuilder({ onAgentCreated }: AgentBuilderProps) {
  const { servers, loading } = useMCP();
  const [activeTab, setActiveTab] = useState('template');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [customCode, setCustomCode] = useState('');
  const [agentName, setAgentName] = useState('My MCP Agent');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant with access to MCP tools.');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [generatingAgent, setGeneratingAgent] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedMCPServers, setSelectedMCPServers] = useState<string[]>([]);
  const [agentCreated, setAgentCreated] = useState(false);

  // Set initial code when a template is selected
  useEffect(() => {
    if (selectedTemplate) {
      setCustomCode(selectedTemplate.code);
      setDescription(selectedTemplate.description);
    }
  }, [selectedTemplate]);

  // Generate agent code from system prompt and selected servers
  const generateAgentCode = async () => {
    setGeneratingAgent(true);
    setGenerationError(null);

    try {
      // Get selected server names
      const selectedServerNames = selectedMCPServers.map(id => 
        servers.find(s => s.id === id)?.name || 'unknown'
      );

      // Call the agent code generation API
      const response = await fetch('/api/agent/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt,
          modelName,
          serverNames: selectedServerNames,
          agentName,
          description
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate agent code');
      }

      const data = await response.json();
      setCustomCode(data.code);
      setActiveTab('code');
    } catch (error) {
      console.error("Error generating agent:", error);
      setGenerationError(error instanceof Error ? error.message : "Failed to generate agent code. Please try again.");
    } finally {
      setGeneratingAgent(false);
    }
  };

  // Save the agent code
  const saveAgent = async () => {
    try {
      const response = await fetch('/api/agent/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: customCode,
          agentName,
          description
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save agent');
      }

      const data = await response.json();
      setAgentCreated(true);
      
      // Call the callback if provided
      if (onAgentCreated) {
        onAgentCreated();
      }
    } catch (error) {
      console.error("Error saving agent:", error);
      setGenerationError(error instanceof Error ? error.message : "Failed to save agent. Please try again.");
    }
  };

  // Run the agent
  const runAgent = async () => {
    try {
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run agent');
      }

      alert(`Agent started: ${data.message || 'Agent is running'}`);
    } catch (error) {
      console.error("Error running agent:", error);
      alert(error instanceof Error ? error.message : "Failed to run the agent. Please try again.");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          MCP Agent Builder
        </CardTitle>
        <CardDescription>
          Create, customize, and run MCP-enabled agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Agent Name and Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Agent Name</label>
              <Input 
                value={agentName} 
                onChange={(e) => setAgentName(e.target.value)} 
                placeholder="My MCP Agent" 
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="A brief description of what this agent does" 
              />
            </div>
          </div>

          {/* Agent Configuration Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="template" className="flex items-center gap-1">
                <Wand className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-1">
                <Pencil className="h-4 w-4" />
                Configure
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-1">
                <Code className="h-4 w-4" />
                Code
              </TabsTrigger>
            </TabsList>
            
            {/* Template Tab */}
            <TabsContent value="template" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                Choose a template to get started quickly with common agent patterns.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEFAULT_TEMPLATES.map((template, index) => (
                  <Card 
                    key={index} 
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplate?.name === template.name ? 'border-primary border-2' : 'border'}`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="py-4">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="text-xs">{template.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0 pb-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setActiveTab('code');
                        }}
                      >
                        <Code className="h-3 w-3 mr-1" />
                        View Code
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                
                {/* Custom Template Option */}
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md border border-dashed`}
                  onClick={() => {
                    setSelectedTemplate(null);
                    setCustomCode('# Write your custom MCP agent code here\n');
                    setActiveTab('code');
                  }}
                >
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">Create Custom</CardTitle>
                    <CardDescription className="text-xs">Start from scratch with your own code</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0 pb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Custom Code
                    </Button>
                  </CardFooter>
                </Card>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button onClick={() => setActiveTab('config')}>
                  Next: Configure
                </Button>
              </div>
            </TabsContent>
            
            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Model</label>
                  <Select value={modelName} onValueChange={setModelName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>OpenAI Models</SelectLabel>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">System Prompt</label>
                <Textarea 
                  value={systemPrompt} 
                  onChange={(e) => setSystemPrompt(e.target.value)} 
                  placeholder="Instructions for the agent"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This prompt defines how the agent behaves and what its capabilities are.
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">MCP Servers</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select which MCP servers this agent should have access to.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {loading ? (
                    <div className="col-span-full text-center py-4">Loading servers...</div>
                  ) : servers.length === 0 ? (
                    <div className="col-span-full text-center py-4">No MCP servers available</div>
                  ) : (
                    servers.map(server => (
                      <div 
                        key={server.id}
                        className={`p-2 rounded-md cursor-pointer border ${
                          selectedMCPServers.includes(server.id) 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedMCPServers(prev => 
                            prev.includes(server.id)
                              ? prev.filter(id => id !== server.id)
                              : [...prev, server.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm font-medium truncate">{server.name}</span>
                        </div>
                        {server.tools && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {server.tools.length} tools
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setActiveTab('template')}>
                  Back
                </Button>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={generateAgentCode}
                    disabled={generatingAgent}
                  >
                    {generatingAgent ? (
                      <>Generating</>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Generate Code
                      </>
                    )}
                  </Button>
                  <Button onClick={() => setActiveTab('code')}>
                    Next: Edit Code
                  </Button>
                </div>
              </div>
              
              {generationError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{generationError}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            {/* Code Tab */}
            <TabsContent value="code" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                Review and edit your agent's code.
              </p>
              
              <div className="border rounded-md bg-black/95 text-white">
                <div className="flex items-center justify-between p-2 border-b border-gray-800">
                  <div className="text-xs font-mono">python</div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(customCode);
                        } catch (err) {
                          console.error("Failed to copy code:", err);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[420px] p-4">
                  <pre className="font-mono text-sm">
                    <textarea
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="w-full h-[400px] bg-transparent border-none focus:outline-none resize-none"
                    />
                  </pre>
                </ScrollArea>
              </div>
              
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setActiveTab('config')}>
                  Back
                </Button>
                <div className="space-x-2">
                  <Button onClick={saveAgent} disabled={agentCreated}>
                    <Save className="h-4 w-4 mr-1" />
                    {agentCreated ? 'Saved' : 'Save Agent'}
                  </Button>
                  <Button 
                    variant="default" 
                    className="bg-green-600 hover:bg-green-700 text-white" 
                    onClick={runAgent}
                    disabled={!agentCreated}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Run Agent
                  </Button>
                </div>
              </div>
              
              {agentCreated && (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <AlertTitle className="text-green-800 dark:text-green-300">Agent Created Successfully</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Your agent has been saved and is ready to use. Click "Run Agent" to start it.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}