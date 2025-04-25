"use client";

import React, { useState, useEffect } from "react";
import { AgentBuilder } from "@/components/agent-builder";
import { AgentTerminal } from "@/components/agent-terminal";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bot, Cpu, Github, Info, Play, Calendar, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string;
  created: string;
  modified: string;
  filePath: string;
}

export default function AgentStudioPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Fetch agents when the component mounts
  useEffect(() => {
    fetchAgents();
  }, []);

  // Function to fetch agents
  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/list');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to run an agent
  const runAgent = async (agentId: string) => {
    try {
      console.log(`[AgentStudioPage] runAgent called for ${agentId} at ${new Date().toISOString()}`);
      setRunningAgent(agentId);
      setSelectedAgentId(agentId);
      setTerminalOpen(true);
    } catch (error) {
      console.error('Error running agent:', error);
      alert('Failed to start agent');
      setRunningAgent(null);
    }
  };

  // Format date string
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/" title="Back to MCP Studio">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cpu className="h-7 w-7 text-primary" />
              MCP Agent Studio
            </h1>
            <p className="text-muted-foreground max-w-2xl mt-1">
              Create, customize, and run AI agents with Model Context Protocol (MCP) capabilities.
              Build specialized agents that can access files, search the web, and interact with various tools.
            </p>
          </div>
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>About MCP</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row justify-between gap-4 items-start">
            <span>
              The Model Context Protocol (MCP) is an open standard for connecting AI models to external tools and capabilities.
            </span>
            <Button variant="outline" size="sm" asChild>
              <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                <Github className="h-4 w-4" />
                Documentation
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        <AgentBuilder onAgentCreated={fetchAgents} />
        
        <div className="mt-8">
          <Separator className="my-6" />
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Your Agents
            </h2>
            
            <Button variant="outline" size="sm" onClick={fetchAgents} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : agents.length === 0 ? (
            <div className="rounded-lg border p-8 text-center">
              <h3 className="text-lg font-medium mb-2">No Agents Created Yet</h3>
              <p className="text-muted-foreground mb-4">
                Use the Agent Builder above to create your first MCP-enabled agent.
              </p>
              <Button asChild>
                <Link href="#" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Create Your First Agent
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <Card key={agent.id} className="hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      {agent.name}
                    </CardTitle>
                    <CardDescription>{agent.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Created: {formatDate(agent.created)}</span>
                    </div>
                    <Badge variant="outline" className="mt-2 bg-primary/5 text-primary border-primary/20">
                      {agent.filePath}
                    </Badge>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => runAgent(agent.id)} 
                      className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                      disabled={runningAgent === agent.id}
                    >
                      {runningAgent === agent.id ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Run Agent
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Agent Terminal Dialog */}
        <Dialog open={terminalOpen} onOpenChange={(open) => {
          setTerminalOpen(open);
          if (!open) {
            setRunningAgent(null);
          }
        }}>
          <DialogContent className="max-w-4xl p-0 h-[80vh] max-h-[700px] flex flex-col">
            <DialogHeader className="sr-only">
              <DialogTitle>Agent Terminal</DialogTitle>
            </DialogHeader>
            {selectedAgentId && (
              <AgentTerminal 
                agentId={selectedAgentId} 
                onClose={() => setTerminalOpen(false)} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}