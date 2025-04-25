import { NextRequest, NextResponse } from 'next/server';
import { registeredServers } from '../../../servers/data';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { sessionMessages } from '../../../sessions/data';

// Define interface for OpenAI API message
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { message, serverId } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' }, 
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        content: `Error: OpenAI API key is not set. Please configure the OPENAI_API_KEY environment variable.`,
      }, { status: 500 });
    }
    
    // Get previous messages for this session to maintain context
    const previousMessages = sessionMessages[sessionId] || [];
    
    // Format messages for OpenAI
    const formattedMessages: OpenAIMessage[] = previousMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant', 
      content: msg.content
    }));
    
    // Add system message at the beginning
    formattedMessages.unshift({
      role: 'system',
      content: 'You are a helpful assistant integrated with the Model Context Protocol (MCP). Answer user questions concisely and accurately.'
    });
    
    // Add the current message
    formattedMessages.push({
      role: 'user',
      content: message
    });
    
    let responseContent = '';
    
    // If a server is selected, add information about available tools
    if (serverId) {
      const server = registeredServers.find((s) => s.id === serverId);
      if (server) {
        try {
          // Connect to MCP server to get tools information
          const client = new Client({ name: 'mcp-frontend-assistant', version: '1.0.0' });
          const transport = new StreamableHTTPClientTransport(new URL(server.url));
          await client.connect(transport);
          const { tools } = await client.listTools();
          
          // Add tool information to the system message
          const toolSummaries = tools.map((t) => `• ${t.name}: ${t.description ?? ''}`).join('\n');
          
          // Replace the system message with updated tool information
          formattedMessages[0] = {
            role: 'system',
            content: `You are a helpful assistant integrated with the Model Context Protocol (MCP). 
            You have access to the following tools from the "${server.name}" server:
            
            ${toolSummaries}
            
            When the user asks to use a specific tool, explain which tool you would use and what parameters you would provide.`
          };
        } catch (err: any) {
          console.error('Assistant MCP error:', err);
          // Continue with basic GPT-4.1 capabilities if MCP tools aren't available
        }
      }
    }

    // Call the OpenAI API with GPT-4.1 with fallback options using fetch
    try {
      // First try with gpt-4.1
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4.1',
            messages: formattedMessages,
            temperature: 0.2,
            max_tokens: 1000
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const completion = await response.json();
        responseContent = completion.choices[0].message.content || 'No response generated.';
      } catch (modelError: any) {
        // If GPT-4.1 is not available, try falling back to other models
        console.warn('GPT-4.1 unavailable, falling back to alternative model:', modelError.message);
        
        // Get available models
        const modelsResponse = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!modelsResponse.ok) {
          throw new Error(`Failed to get available models: ${modelsResponse.status} ${modelsResponse.statusText}`);
        }
        
        const modelsData = await modelsResponse.json();
        
        // Look for alternative GPT-4 models in preference order
        const modelPreferenceList = [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4.1',
          'gpt-o4-mini',
          'gpt-o4-mini-high',
          'gpt-4'
        ];
        
        // Find the first available model from our preference list
        const availableModelIds = modelsData.data.map((m: any) => m.id);
        const fallbackModel = modelPreferenceList.find(model => 
          availableModelIds.includes(model)
        ) || 'gpt-4o-mini'; // Default fallback
        
        console.log(`Falling back to model: ${fallbackModel}`);
        
        // Try with the fallback model
        const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages: formattedMessages,
            temperature: 0.2,
            max_tokens: 1000
          })
        });
        
        if (!fallbackResponse.ok) {
          const errorData = await fallbackResponse.json().catch(() => ({}));
          throw new Error(`OpenAI API error with fallback model: ${fallbackResponse.status} ${errorData.error?.message || fallbackResponse.statusText}`);
        }
        
        const fallbackCompletion = await fallbackResponse.json();
        responseContent = fallbackCompletion.choices[0].message.content || 'No response generated.';
        responseContent = `[Using ${fallbackModel} instead of gpt-4.1]\n\n${responseContent}`;
      }
    } catch (apiError: any) {
      console.error('OpenAI API error:', apiError);
      
      // Handle API errors
      if (apiError.message?.includes('404')) {
        responseContent = "Error: No compatible OpenAI model was found. Please check your API access permissions.";
      } else if (apiError.message?.includes('401')) {
        responseContent = "Error: Authentication failed with OpenAI API. Please check your API key.";
      } else {
        responseContent = `Error communicating with OpenAI API: ${apiError.message || 'Unknown error'}`;
      }
    }
    
    // Return the assistant's response
    return NextResponse.json({
      id: `asst-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
      content: responseContent,
    });
  } catch (error) {
    console.error('Unexpected error in assistant route:', error);
    return NextResponse.json(
      { error: 'Failed to process the message' },
      { status: 500 }
    );
  }
}