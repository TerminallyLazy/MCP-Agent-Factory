import * as fs from 'fs';
import { join } from 'path';

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  capabilities: {
    tools: { listChanged: boolean };
  };
  description?: string;
  version?: string;
  lastConnected?: string;
}

// Load servers from config file
function loadServersFromConfig(): MCPServer[] {
  try {
    // Try to read from both config files
    const rootConfigPath = join(process.cwd(), '..', 'mcp_config.json');
    const frontendConfigPath = join(process.cwd(), 'src', 'mcp_config.json');

    let config = null;

    // Try to read from root config first
    try {
      const rootConfigContent = fs.readFileSync(rootConfigPath, 'utf8');
      config = JSON.parse(rootConfigContent);
    } catch (error) {
      console.warn('Root config not found or invalid, trying frontend config');
    }

    // If root config failed, try frontend config
    if (!config) {
      try {
        const frontendConfigContent = fs.readFileSync(frontendConfigPath, 'utf8');
        config = JSON.parse(frontendConfigContent);
      } catch (error) {
        console.warn('Frontend config not found or invalid');
        return [];
      }
    }

    // Check if the config has mcpServers
    if (!config.mcpServers) {
      console.warn('No mcpServers found in config');
      return [];
    }

    // Convert config servers to MCPServer objects
    const servers: MCPServer[] = Object.entries(config.mcpServers).map(([id, serverConfig]) => {
      const typedConfig = serverConfig as any;

      // Create a URL for the server
      // For local servers, use localhost with a port
      // For remote servers, use the provided URL
      let url = '';
      if (typedConfig.url) {
        url = typedConfig.url;
      } else {
        // Default to localhost with a port based on the server ID
        // This is just a placeholder and should be replaced with actual URLs
        url = `http://localhost:${3000 + Math.floor(Math.random() * 1000)}`;
      }

      return {
        id,
        name: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        url,
        status: 'offline',
        capabilities: {
          tools: { listChanged: true }
        },
        description: typedConfig.description || `MCP Server for ${id}`,
        version: typedConfig.version || '1.0.0'
      };
    });

    return servers;
  } catch (error) {
    console.error('Error loading servers from config:', error);
    return [];
  }
}

// In-memory list of registered MCP servers.
// On a real deployment you would back this by a database or external service.
export const registeredServers: MCPServer[] = loadServersFromConfig();