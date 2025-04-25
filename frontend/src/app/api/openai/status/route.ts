import { NextRequest, NextResponse } from 'next/server';

// GET OpenAI API status
export async function GET() {
  try {
    console.log('GET /api/openai/status called');
    
    // Check if OpenAI API key is set
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('OpenAI API key not set');
      return NextResponse.json({
        status: 'error',
        message: 'OpenAI API key not set. Please set the OPENAI_API_KEY environment variable.'
      }, { status: 500 });
    }
    
    // Test the API connection with a models list request using fetch
    console.log('Testing OpenAI API connection...');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }
    
    const modelsData = await response.json();
    
    // Check specifically for GPT-4.1 availability
    const gpt41Available = modelsData.data?.some((model: any) => model.id === 'gpt-4.1') || false;
    
    // If we get here, the connection was successful
    console.log('OpenAI API connection successful');
    console.log('GPT-4.1 available:', gpt41Available);
    
    // Get available models - prioritize showing GPT-4.1 if available
    const availableModels: string[] = [];
    
    if (gpt41Available) {
      availableModels.push('gpt-4.1');
    }
    
    // Add other recent GPT-4 models
    const gpt4Models = modelsData.data
      ?.filter((model: any) => model.id.startsWith('gpt-4'))
      ?.map((model: any) => model.id)
      ?.slice(0, 5) || [];
      
    // Combine models lists without duplicates
    const uniqueModels = [...new Set([...availableModels, ...gpt4Models])];
    
    return NextResponse.json({
      status: 'online',
      message: gpt41Available 
        ? 'OpenAI API connection successful. GPT-4.1 is available.'
        : 'OpenAI API connection successful, but GPT-4.1 is not available. The app will fall back to another model if needed.',
      models: uniqueModels
    });
  } catch (error) {
    console.error('Error checking OpenAI API status:', error);
    
    return NextResponse.json({
      status: 'error',
      message: `Failed to connect to OpenAI API: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
