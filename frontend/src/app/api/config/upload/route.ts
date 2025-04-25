import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';

// GET the current configuration
export async function GET() {
  try {
    // Read the configuration file from both locations
    const rootConfigPath = join(process.cwd(), '..', 'mcp_config.json');
    const frontendConfigPath = join(process.cwd(), 'src', 'mcp_config.json');

    let rootConfig = {};
    let frontendConfig = {};

    try {
      const rootConfigContent = await fs.promises.readFile(rootConfigPath, 'utf8');
      rootConfig = JSON.parse(rootConfigContent);
    } catch (error) {
      console.error('Error reading root config:', error);
    }

    try {
      const frontendConfigContent = await fs.promises.readFile(frontendConfigPath, 'utf8');
      frontendConfig = JSON.parse(frontendConfigContent);
    } catch (error) {
      console.error('Error reading frontend config:', error);
    }

    return NextResponse.json({
      rootConfig,
      frontendConfig
    });
  } catch (error) {
    console.error('Error getting configuration:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}

// POST to upload a new configuration file
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/config/upload called");

    // Parse the form data
    const formData = await request.formData();
    console.log("FormData entries:", [...formData.entries()].map(([key, value]) => `${key}: ${typeof value}`));

    const file = formData.get('file');
    console.log("File object:", file ? "Found" : "Not found", file instanceof File ? "Is File instance" : "Not a File instance");

    if (!file || !(file instanceof File)) {
      console.error("No valid file in request");
      return NextResponse.json(
        { error: 'No file uploaded or invalid file' },
        { status: 400 }
      );
    }

    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate that the file is a JSON file
    if (!file.name.endsWith('.json')) {
      console.error("File is not a JSON file:", file.name);
      return NextResponse.json(
        { error: 'File must be a JSON file' },
        { status: 400 }
      );
    }

    // Read the file content
    console.log("Reading file content");
    const fileContent = await file.text();
    console.log("File content length:", fileContent.length);

    // Validate the JSON structure
    let config;
    try {
      config = JSON.parse(fileContent);
      console.log("Parsed JSON successfully");

      // Check if the config has the expected structure
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        console.error("Invalid configuration format: missing mcpServers object");
        throw new Error('Invalid configuration format: missing mcpServers object');
      }

      // Validate each server entry
      for (const [serverId, server] of Object.entries(config.mcpServers)) {
        const typedServer = server as any;
        console.log(`Validating server: ${serverId}`);
        if (!typedServer.command || !typedServer.args) {
          console.error(`Invalid server configuration for ${serverId}: missing required fields`);
          throw new Error(`Invalid server configuration for ${serverId}: missing required fields`);
        }
      }

      console.log("All servers validated successfully");
    } catch (error) {
      console.error("JSON validation error:", error);
      return NextResponse.json(
        { error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Read the existing configuration files
    console.log("Reading existing configuration files");
    const rootConfigPath = join(process.cwd(), '..', 'mcp_config.json');
    const frontendConfigPath = join(process.cwd(), 'src', 'mcp_config.json');

    console.log("Config paths:", {
      rootConfigPath,
      frontendConfigPath
    });

    let rootConfig = { mcpServers: {} };
    let frontendConfig = { mcpServers: {} };

    try {
      console.log("Reading root config from:", rootConfigPath);
      const rootConfigContent = await fs.promises.readFile(rootConfigPath, 'utf8');
      rootConfig = JSON.parse(rootConfigContent);
      console.log("Root config read successfully");
    } catch (error) {
      console.warn('Root config not found or invalid, creating new one:', error);
    }

    try {
      console.log("Reading frontend config from:", frontendConfigPath);
      const frontendConfigContent = await fs.promises.readFile(frontendConfigPath, 'utf8');
      frontendConfig = JSON.parse(frontendConfigContent);
      console.log("Frontend config read successfully");
    } catch (error) {
      console.warn('Frontend config not found or invalid, creating new one:', error);
    }

    // Merge the uploaded configuration with the existing ones
    console.log("Merging configurations");
    const mergedRootConfig = {
      mcpServers: {
        ...rootConfig.mcpServers,
        ...config.mcpServers
      }
    };

    const mergedFrontendConfig = {
      mcpServers: {
        ...frontendConfig.mcpServers,
        ...config.mcpServers
      }
    };

    // Write the updated configuration files
    console.log("Writing updated configuration files");
    try {
      await writeFile(rootConfigPath, JSON.stringify(mergedRootConfig, null, 2));
      console.log("Root config written successfully");
    } catch (error) {
      console.error("Error writing root config:", error);
      throw new Error(`Failed to write root config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      await writeFile(frontendConfigPath, JSON.stringify(mergedFrontendConfig, null, 2));
      console.log("Frontend config written successfully");
    } catch (error) {
      console.error("Error writing frontend config:", error);
      throw new Error(`Failed to write frontend config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const addedServers = Object.keys(config.mcpServers);
    console.log("Configuration updated successfully. Added servers:", addedServers);

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      addedServers
    });
  } catch (error) {
    console.error('Error uploading configuration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload configuration' },
      { status: 500 }
    );
  }
}
