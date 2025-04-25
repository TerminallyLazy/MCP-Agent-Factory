"use client";

import { ThemeProvider } from "next-themes";
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

// MCP Types
type Tool = {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
};

interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  tools: Tool[];
}

type MCPContextType = {
  servers: MCPServer[];
  loading: boolean;
  error: string | null;
  addServer: (server: Omit<MCPServer, 'id' | 'status' | 'tools'>) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  toggleServerStatus: (id: string) => Promise<void>;
  fetchServerTools: (serverId: string) => Promise<Tool[]>;
  selectedServer: MCPServer | null;
  setSelectedServer: (server: MCPServer | null) => void;
};

// Create context with default values
export const MCPContext = createContext<MCPContextType>({
  servers: [],
  loading: false,
  error: null,
  addServer: async () => {},
  removeServer: async () => {},
  toggleServerStatus: async () => {},
  fetchServerTools: async () => [],
  selectedServer: null,
  setSelectedServer: () => {},
});

// MCP Provider component
export function MCPProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);

  // Fetch all servers on component mount
  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/servers');

        if (!response.ok) {
          throw new Error(`Failed to fetch servers: ${response.statusText}`);
        }

        const data = await response.json();
        setServers(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching servers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch servers');
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, []);

  // Add a new server
  const addServer = async (server: Omit<MCPServer, 'id' | 'status' | 'tools'>) => {
    try {
      setLoading(true);
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(server),
      });

      if (!response.ok) {
        throw new Error(`Failed to add server: ${response.statusText}`);
      }

      const newServer = await response.json();
      setServers(prevServers => [...prevServers, newServer]);
      return newServer;
    } catch (err) {
      console.error('Error adding server:', err);
      setError(err instanceof Error ? err.message : 'Failed to add server');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove a server
  const removeServer = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/servers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to remove server: ${response.statusText}`);
      }

      setServers(prevServers => prevServers.filter(server => server.id !== id));

      // If the removed server was selected, clear selection
      if (selectedServer?.id === id) {
        setSelectedServer(null);
      }
    } catch (err) {
      console.error('Error removing server:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove server');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Toggle server status
  const toggleServerStatus = async (id: string) => {
    try {
      const server = servers.find(s => s.id === id);
      if (!server) throw new Error(`Server with id ${id} not found`);

      const newStatus = server.status === 'online' ? 'offline' : 'online';

      const response = await fetch(`/api/servers/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update server status: ${response.statusText}`);
      }

      const updatedServer = await response.json();

      setServers(prevServers =>
        prevServers.map(server =>
          server.id === id ? updatedServer : server
        )
      );

      // If this was the selected server, update it
      if (selectedServer?.id === id) {
        setSelectedServer(updatedServer);
      }
    } catch (err) {
      console.error('Error toggling server status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle server status');
      throw err;
    }
  };

  // Function to fetch tools for a specific server
  const fetchServerTools = async (serverId: string): Promise<Tool[]> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/servers/${serverId}/tools`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }

      const tools = await response.json();

      // Update the server with fetched tools
      setServers(prevServers =>
        prevServers.map(server =>
          server.id === serverId
            ? { ...server, tools }
            : server
        )
      );

      return tools;
    } catch (err) {
      console.error(`Error fetching tools for server ${serverId}:`, err);
      setError(err instanceof Error ? err.message : `Failed to fetch tools for server ${serverId}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // When a server is selected, fetch its tools if they don't exist yet
  useEffect(() => {
    if (selectedServer && (!selectedServer.tools || selectedServer.tools.length === 0)) {
      fetchServerTools(selectedServer.id);
    }
  }, [selectedServer]);

  // Context value
  const contextValue: MCPContextType = {
    servers,
    loading,
    error,
    addServer,
    removeServer,
    toggleServerStatus,
    fetchServerTools,
    selectedServer,
    setSelectedServer,
  };

  return (
    <MCPContext.Provider value={contextValue}>
      {children}
    </MCPContext.Provider>
  );
}

// Custom hook for using MCP context
export function useMCP() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error('useMCP must be used within an MCPProvider');
  }
  return context;
}

// Main Providers component that combines theme and MCP providers
export function Providers({ children }: ProvidersProps) {
  // Fix hydration by ensuring theme is only applied after mount
  const [mounted, setMounted] = useState(false);

  // Use effect to set the mounted state after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={mounted ? undefined : "light"} // Force light theme on server to match initial client render
    >
      {mounted ? (
        <MCPProvider>
          {children}
        </MCPProvider>
      ) : (
        <div style={{ visibility: "hidden" }}>{children}</div>
      )}
    </ThemeProvider>
  );
}

export default Providers;
