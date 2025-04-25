"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMCP } from "@/components/Providers";
import { SimpleFileUpload } from "@/components/simple-file-upload";
import { OpenAIStatus } from "@/components/openai-status";
import {
  Server,
  Zap,
  MessageSquare,
  Clock,
  Save,
  LayoutDashboard,
  Settings,
  RefreshCw,
  Wrench,
  ArrowRight,
  Plus,
  Bot,
  Code,
  AlertTriangle,
  AlertCircle,
  Upload
} from "lucide-react";
import ChatInterface from "@/components/chat/chat-interface";
import type { ChatMessage } from "@/types/mcp";

// Define interfaces for our chat and session data
interface Session {
  id: string;
  name: string;
  lastActive: Date;
  messageCount: number;
}

export default function Home() {
  // Use the MCP Context instead of hardcoded data
  const { servers, loading, error, addServer, removeServer, toggleServerStatus, selectedServer, setSelectedServer } = useMCP();

  // State for chat and sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");
  const [addingServer, setAddingServer] = useState(false);

  // Load sessions from API on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoadingSessions(true);
        const response = await fetch('/api/sessions');

        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.statusText}`);
        }

        const data = await response.json();
        setSessions(data.map((session: any) => ({
          ...session,
          lastActive: new Date(session.lastActive)
        })));

        // Set active session to the most recent one if we have sessions
        if (data.length > 0 && !activeSession) {
          setActiveSession(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, []);

  // Load chat messages when active session changes
  useEffect(() => {
    if (!activeSession) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await fetch(`/api/sessions/${activeSession}/messages`);

        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }

        const data = await response.json();
        // Map backend message format to ChatMessage type
        const formatted: ChatMessage[] = data.map((msg: any) => ({
          id: msg.id,
          role: msg.sender,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          toolCalls: msg.toolCalls,
        }));
        setChatMessages(formatted);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeSession]);

  // Handle creating a new session
  const handleCreateSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `New Session ${Math.floor(Math.random() * 1000)}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const newSession = await response.json();
      setSessions(prev => [{
        ...newSession,
        lastActive: new Date(newSession.lastActive)
      }, ...prev]);
      setActiveSession(newSession.id);
      setChatMessages([]);
    } catch (err) {
      console.error('Error creating session:', err);
    }
  };

  // Handle sending a message via ChatInterface
  const handleChatSend = async (content: string): Promise<ChatMessage> => {
    if (!activeSession) throw new Error('No active session');
    // Persist user message
    await fetch(`/api/sessions/${activeSession}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, sender: 'user' }),
    });
    // Get assistant response
    const assistantRes = await fetch(`/api/sessions/${activeSession}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, serverId: selectedServer?.id }),
    });
    if (!assistantRes.ok) {
      throw new Error(`Failed to get assistant response: ${assistantRes.statusText}`);
    }
    const raw = await assistantRes.json();
    // Map to ChatMessage
    return {
      id: raw.id,
      role: raw.sender,
      content: raw.content,
      timestamp: new Date(raw.timestamp),
      toolCalls: raw.toolCalls,
    };
  };

  // Handle adding a new MCP server
  const handleAddServer = async () => {
    if (!newServerName.trim() || !newServerUrl.trim()) return;

    setAddingServer(true);
    try {
      await addServer({
        name: newServerName,
        url: newServerUrl
      });

      // Reset form
      setNewServerName('');
      setNewServerUrl('');
    } catch (err) {
      console.error('Error adding server:', err);
    } finally {
      setAddingServer(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-100px)]">
      {/* Sidebar for sessions */}
      <div className="w-64 border-r border-border bg-background/50 p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Sessions
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Manage your chat sessions</p>

          <Button
            variant="default"
            className="w-full mb-4 justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:scale-[1.02]"
            onClick={handleCreateSession}
          >
            <Plus className="w-4 h-4" />
            New Session
          </Button>

          <div className="space-y-2 max-h-[300px] overflow-auto pr-1 custom-scrollbar">
            {loadingSessions ? (
              <div className="flex justify-center py-4">
                <div className="loading loading-spinner loading-sm"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No sessions yet. Create one to start.
              </div>
            ) : (
              sessions.map(session => (
                <button
                  key={session.id}
                  className={`w-full text-left p-2 rounded-lg transition-all shadow-sm hover:shadow ${activeSession === session.id ? 'bg-primary/20 border-2 border-primary text-primary' : 'hover:bg-accent border border-border'}`}
                  onClick={() => setActiveSession(session.id)}
                >
                  <div className="font-medium truncate">{session.name}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{session.lastActive.toLocaleDateString()}</span>
                    <Badge variant={activeSession === session.id ? 'default' : 'outline'} className="text-xs font-bold">{session.messageCount}</Badge>
                  </div>
                </button>
              ))
            )}
          </div>

        </div>

        <Separator className="my-4" />

        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-5 h-5 text-muted-foreground" />
            Server Status
          </h2>
          <p className="text-xs text-muted-foreground mb-4">MCP Server connections</p>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="loading loading-spinner loading-sm"></div>
            </div>
          ) : error ? (
            <div className="text-center py-2 text-destructive text-sm">
              {error}
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No servers configured.
            </div>
          ) : (
            <div className="space-y-2">
              {servers.map(server => (
                <div
                  key={server.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${selectedServer?.id === server.id ? 'bg-primary/20 border-2 border-primary' : 'hover:bg-accent border border-border'} cursor-pointer shadow-sm hover:shadow transition-all`}
                  onClick={() => setSelectedServer(server)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={selectedServer?.id === server.id ? 'text-primary font-medium' : ''}>{server.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={server.status === 'online' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {server.status}
                    </Badge>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-6 w-6 hover:bg-secondary/80 hover:text-secondary-foreground hover:scale-110 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleServerStatus(server.id);
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <div className="border-b px-4 py-2">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="tools" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chat interface */}
          <TabsContent value="chat" className="flex-1 flex flex-col p-0 overflow-hidden">
            {!activeSession ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Session</h3>
                <p className="text-muted-foreground max-w-md">
                  Select an existing session or create a new one to start chatting with the MCP assistant.
                </p>
                <Button onClick={handleCreateSession} className="mt-4">
                  Create New Session
                </Button>
              </div>
            ) : (
              <ChatInterface
                className="flex-1"
                initialMessages={chatMessages}
                onSendMessage={handleChatSend}
              />
            )}
          </TabsContent>

          {/* Tools panel */}
          <TabsContent value="tools" className="flex-1 p-4 overflow-auto">
            {!selectedServer ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Server Selected</h3>
                <p className="text-muted-foreground max-w-md">
                  Select an MCP server from the sidebar to view available tools.
                </p>
              </div>
            ) : loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="loading loading-spinner loading-lg"></div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">{selectedServer.name} Tools</h2>
                  <p className="text-muted-foreground">Available tools from the selected MCP server</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedServer.tools && selectedServer.tools.length > 0 ? (
                    selectedServer.tools.map(tool => (
                      <Card key={tool.id} className="hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-primary cursor-pointer">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Code className="h-4 w-4" />
                            {tool.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{tool.description || 'No description available'}</p>
                        </CardContent>
                        <CardFooter>
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full bg-primary/90 hover:bg-primary text-primary-foreground font-medium shadow hover:shadow-md transition-all hover:scale-105"
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Use Tool
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-8 text-muted-foreground">
                      No tools available for this server.
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Settings panel */}
          <TabsContent value="settings" className="flex-1 p-4 overflow-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>MCP Configuration</CardTitle>
                  <CardDescription>Manage your MCP integration settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Server Connections</h3>
                    <div className="space-y-2">
                      {servers.map(server => (
                        <div key={server.id} className="flex items-center justify-between p-2 border rounded-md">
                          <div>
                            <div className="font-medium">{server.name}</div>
                            <div className="text-xs text-muted-foreground">{server.url}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={server.status === 'online' ? 'outline' : 'default'}
                              onClick={() => toggleServerStatus(server.id)}
                              className="h-8 hover:scale-105 transition-all shadow-sm hover:shadow"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              {server.status === 'online' ? 'Restart' : 'Start'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeServer(server.id)}
                              className="h-8 hover:scale-105 transition-all shadow-sm hover:shadow font-medium"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">Add New Server</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 gap-2">
                        <label className="text-xs">Server Name</label>
                        <Input
                          value={newServerName}
                          onChange={(e) => setNewServerName(e.target.value)}
                          placeholder="My MCP Server"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <label className="text-xs">Server URL</label>
                        <Input
                          value={newServerUrl}
                          onChange={(e) => setNewServerUrl(e.target.value)}
                          placeholder="http://localhost:3001"
                        />
                      </div>
                      <Button
                        onClick={handleAddServer}
                        disabled={addingServer || !newServerName.trim() || !newServerUrl.trim()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-all shadow hover:shadow-md mt-2"
                        size="lg"
                      >
                        {addingServer ? (
                          <>
                            <div className="loading loading-spinner loading-xs mr-2"></div>
                            Adding Server...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add MCP Server
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">Upload MCP Configuration</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Upload a JSON file containing MCP server configurations to add them to your system.
                      <a
                        href="/sample_mcp_config.json"
                        download
                        className="text-primary hover:underline ml-1"
                      >
                        Download sample configuration
                      </a>
                    </p>
                    <SimpleFileUpload
                      onConfigUpdated={() => {
                        // Refresh the server list after config update
                        window.location.reload();
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* OpenAI API Status Card */}
              <OpenAIStatus />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
