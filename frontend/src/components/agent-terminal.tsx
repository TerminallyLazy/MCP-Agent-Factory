"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Terminal, Send, X, FileDown, ClipboardCopy, Code, MessageSquare, ArrowDown } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface AgentTerminalProps {
  agentId: string;
  onClose: () => void;
  accentColor?: string;
}

type OutputLine = {
  id: string;
  type: 'stdout' | 'stderr' | 'exit' | 'error' | 'system' | 'module-error' | 'import-error' | 'file-error' | 'user-input' | 'agent-response';
  content: string;
  isMarkdown?: boolean;
  isJson?: boolean;
  isCode?: boolean;
  timestamp: Date;
};

// Helper function to format Python dict as JSON
function formatPythonDictAsJson(pythonDict: string): string {
  try {
    // Convert Python-style dict to valid JSON
    let jsonStr = pythonDict
      .replace(/'/g, '"')          // Replace single quotes with double quotes
      .replace(/None/g, 'null')    // Replace Python None with JSON null
      .replace(/True/g, 'true')    // Replace Python True with JSON true
      .replace(/False/g, 'false')  // Replace Python False with JSON false
      .replace(/,\s*}/g, '}')      // Remove trailing commas in objects
      .replace(/,\s*]/g, ']');     // Remove trailing commas in arrays

    // Handle datetime objects
    jsonStr = jsonStr.replace(/datetime\.datetime\([^)]+\)/g, '"<datetime object>"');

    // Handle other Python objects
    jsonStr = jsonStr.replace(/"?<[^>]+>"?/g, '"<Python object>"');

    // Handle nested quotes in strings
    jsonStr = jsonStr.replace(/"([^"]*?)\\?"([^"]*?)\\?"([^"]*?)"/g, (match: string) => {
      return match.replace(/\\?"/g, '\\"');
    });

    // Handle Python byte strings
    jsonStr = jsonStr.replace(/b"([^"]*)"/g, '"$1"');

    // Parse and re-stringify to ensure valid JSON
    const jsonObj = JSON.parse(jsonStr);
    return JSON.stringify(jsonObj, null, 2);
  } catch (err) {
    console.error('Error formatting Python dict as JSON:', err);
    // Return a simplified version if parsing fails
    return pythonDict
      .replace(/'/g, '"')
      .replace(/None/g, 'null')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false');
  }
}

export function AgentTerminal({ agentId, onClose, accentColor = '#3b82f6' }: AgentTerminalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<any>(null);
  const retryCountRef = useRef(0);

  console.log(`[AgentTerminal ${agentId}] Render - isConnected: ${isConnected}, isRunning: ${isRunning}`);

  // Start the agent when the component mounts
  useEffect(() => {
    console.log(`[AgentTerminal ${agentId}] Mounting - starting agent...`);
    startAgent();

    // Clean up when the component unmounts
    return () => {
      console.log(`[AgentTerminal ${agentId}] Unmounting - closing EventSource...`);
      if (eventSourceRef.current) {
        try {
          // Remove all event listeners first
          eventSourceRef.current.onmessage = null;
          eventSourceRef.current.onerror = null;
          eventSourceRef.current.onopen = null;

          // Clear any heartbeat interval
          if ((eventSourceRef.current as any).heartbeatInterval) {
            clearInterval((eventSourceRef.current as any).heartbeatInterval);
          }

          // Close the connection
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        } catch (err) {
          console.error(`[AgentTerminal ${agentId}] Error during cleanup:`, err);
        }
      }

      // Consider also stopping the agent process if desired on close
      try {
        fetch('/api/agent/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId })
        }).catch(err => console.error(`[AgentTerminal ${agentId}] Error stopping agent:`, err));
      } catch (err) {
        console.error(`[AgentTerminal ${agentId}] Error stopping agent:`, err);
      }
    };
  }, [agentId]); // Add agentId as dependency

  // Function to scroll to the bottom
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      // Use a small timeout to ensure the DOM has been updated
      setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          // Smooth scroll to bottom
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });

          // Hide the scroll button after scrolling
          setShowScrollButton(false);

          // Log scrolling for debugging
          console.log(`[AgentTerminal ${agentId}] Scrolled to bottom, height: ${scrollContainer.scrollHeight}`);
        }
      }, 100); // Small delay to ensure content is rendered
    }
  }, [agentId]);

  // Set up scroll detection
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Show scroll button if not at bottom
      const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 50;
      setShowScrollButton(!isAtBottom);
    };

    // Add scroll event listener
    scrollContainer.addEventListener('scroll', handleScroll);

    // Clean up
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auto-scroll to the bottom when new output is added
  useEffect(() => {
    scrollToBottom();
  }, [output, scrollToBottom]); // Re-run when output changes

  const startAgent = async () => {
    console.log(`[AgentTerminal ${agentId}] startAgent called`);
    setIsRunning(true);
    setIsConnected(false); // Reset connection status at start
    setIsConnecting(true); // Set connecting state
    setError(null);
    retryCountRef.current = 0; // Reset retry count

    setOutput([
      {
        id: Date.now().toString(),
        type: 'system',
        content: `Starting agent ${agentId}...`,
        timestamp: new Date(),
      },
    ]);

    try {
      // Create a new EventSource to receive server-sent events
      // First make a POST request to start the agent
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      });

      console.log(`[AgentTerminal ${agentId}] Agent run request sent. Response ok: ${response.ok}, status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[AgentTerminal ${agentId}] Failed run request:`, errorData);
        throw new Error(errorData.error || 'Failed to start agent')
      }

      // Then connect to the SSE endpoint
      await connectEventSource();

    } catch (error) {
      console.error(`[AgentTerminal ${agentId}] Error in startAgent:`, error);
      setError(`Failed to start agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRunning(false);
      setIsConnecting(false);

      // Add error to output
      setOutput(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'error',
          content: `Error starting agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Separate function to connect to the EventSource
  const connectEventSource = async () => {
    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        console.log(`[AgentTerminal ${agentId}] Closing existing EventSource connection`);
        try {
          eventSourceRef.current.onmessage = null;
          eventSourceRef.current.onerror = null;
          eventSourceRef.current.onopen = null;
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        } catch (err) {
          console.error(`[AgentTerminal ${agentId}] Error closing EventSource:`, err);
        }
      }

      console.log(`[AgentTerminal ${agentId}] Connecting to EventSource, retry #${retryCountRef.current}`);
      setIsConnecting(true);

      // Add connecting message to output if this is a retry
      if (retryCountRef.current > 0) {
        setOutput(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'system',
            content: `Attempting to reconnect (try #${retryCountRef.current})...`,
            timestamp: new Date(),
          },
        ]);
      }

      // Connect to the SSE endpoint with a unique timestamp to avoid caching
      const timestamp = new Date().getTime();
      const eventSource = new EventSource(`/api/agent/stream?agentId=${agentId}&t=${timestamp}`);
      eventSourceRef.current = eventSource;

      // Set a connection timeout
      const connectionTimeoutId = setTimeout(() => {
        console.log(`[AgentTerminal ${agentId}] Connection timeout after 10 seconds`);

        try {
          if (eventSourceRef.current) {
            eventSourceRef.current.onmessage = null;
            eventSourceRef.current.onerror = null;
            eventSourceRef.current.onopen = null;
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        } catch (err) {
          console.error(`[AgentTerminal ${agentId}] Error closing EventSource on timeout:`, err);
        }

        // Retry connection if under the retry limit
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          setTimeout(() => {
            connectEventSource(); // Retry with a delay
          }, 1000);
        } else {
          setError('Failed to connect to agent after multiple attempts. Please try again.');
          setIsRunning(false);
          setIsConnecting(false);

          // Add error to output
          setOutput(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              type: 'error',
              content: 'Failed to connect to agent after multiple attempts. Please try again.',
              timestamp: new Date(),
            },
          ]);
        }
      }, 10000); // 10 second timeout

      // Handle connection open
      eventSource.onopen = () => {
        console.log(`[AgentTerminal ${agentId}] EventSource OPEN - isConnected: true`);
        clearTimeout(connectionTimeoutId); // Clear the timeout
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        retryCountRef.current = 0; // Reset retry count on successful connection

        setOutput(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'system',
            content: 'Connected to agent process. Waiting for output...',
            timestamp: new Date(),
          },
        ]);
      };

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        try {
          // Check if this is a heartbeat message (starts with a colon)
          if (event.data.startsWith(':')) {
            console.log(`[AgentTerminal ${agentId}] Received heartbeat:`, event.data);
            // Update last activity timestamp to prevent timeout
            if (eventSourceRef.current) {
              (eventSourceRef.current as any).lastActivity = Date.now();
            }
            return; // Skip processing for heartbeat messages
          }

          console.log(`[AgentTerminal ${agentId}] Received message:`, event.data);

          // Try to parse the JSON data
          const data = JSON.parse(event.data);

          // Update last activity timestamp to prevent timeout
          if (eventSourceRef.current) {
            (eventSourceRef.current as any).lastActivity = Date.now();
          }

          if (data.type === 'exit') {
            setOutput(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                type: 'system',
                content: `Agent process exited with code ${data.code}`,
                timestamp: new Date(),
              },
            ]);
            console.log(`[AgentTerminal ${agentId}] Agent exited. isRunning: false`);
            setIsRunning(false);
            setIsConnecting(false);

            try {
              if (eventSourceRef.current) {
                eventSourceRef.current.onmessage = null;
                eventSourceRef.current.onerror = null;
                eventSourceRef.current.onopen = null;
                eventSourceRef.current.close();
                eventSourceRef.current = null;
              }
            } catch (err) {
              console.error(`[AgentTerminal ${agentId}] Error closing EventSource:`, err);
            }
          } else if (data.type === 'error') {
            setOutput(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                type: 'error',
                content: `Error: ${data.error}`,
                timestamp: new Date(),
              },
            ]);
            console.error(`[AgentTerminal ${agentId}] Received error from agent: ${data.error}`);
            setError(data.error);
            // We don't set isRunning to false here as the process might still be running
          } else if (data.type === 'system') {
            // System messages (like connection established)
            setOutput(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                type: 'system',
                content: data.data || data.content || JSON.stringify(data),
                timestamp: new Date(),
              },
            ]);
          } else {
            // Get the content from the data object
            const rawContent = data.content || data.data || JSON.stringify(data);

            // Check for different patterns of agent output
            const isAgentRunResult = rawContent.includes('Result type:') &&
                                    (rawContent.includes('AgentRunResult') ||
                                     rawContent.includes('pydantic_ai.agent'));

            const isPythonDict = rawContent.includes('Result dict:') &&
                                rawContent.includes('{') &&
                                rawContent.includes('}');

            const isDebugOutput = isAgentRunResult || isPythonDict;

            let isJson = false;
            let formattedJson = '';
            let isAgentResponse = false;
            let actualAgentResponse = '';
            let debugInfo = '';

            if (isDebugOutput) {
              console.log(`[AgentTerminal ${agentId}] Detected agent debug output`);

              // Try multiple patterns to extract the actual response
              const patterns = [
                // Pattern 1: AgentRunResult with data field
                {
                  regex: /Agent result: AgentRunResult\(data='([^]*?)'\)/,
                  dictRegex: /Result dict: (\{[^]*\})/
                },
                // Pattern 2: AgentRunResult with different format
                {
                  regex: /AgentRunResult\(data=['"]([^]*?)['"][\),]/,
                  dictRegex: /['"]data['"]:\s*['"]([^]*?)['"]/
                },
                // Pattern 3: Direct data field in dict
                {
                  regex: /['"]data['"]:\s*['"]([^]*?)['"]/,
                  dictRegex: /Result dict: (\{[^]*\})/
                },
                // Pattern 4: Look for content after "Agent:"
                {
                  regex: /Agent:\s*([^]*?)(?:\n\n|$)/,
                  dictRegex: /Result dict: (\{[^]*\})/
                }
              ];

              // Try each pattern until we find a match
              for (const pattern of patterns) {
                const match = rawContent.match(pattern.regex);
                if (match && match[1]) {
                  // Process the agent response to ensure proper markdown formatting
                  let response = match[1]
                    .replace(/\\n/g, '\n')  // Replace escaped newlines
                    .replace(/\\'/g, "'")   // Replace escaped single quotes
                    .replace(/\\"/g, '"')   // Replace escaped double quotes
                    .replace(/\\t/g, '  ')  // Replace tabs with spaces
                    .trim();

                  // Convert plain text lists to markdown lists
                  response = response.replace(/^(\d+)\.\s+/gm, '$1. ');  // Ensure space after numbered lists
                  response = response.replace(/^-\s*/gm, '- ');          // Ensure space after bullet points

                  // Add line breaks between paragraphs if missing
                  response = response.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');

                  // Format sections that look like headers
                  response = response.replace(/^([A-Z][A-Za-z\s]+):$/gm, '## $1');

                  // Ensure code blocks are properly formatted
                  response = response.replace(/```(\w*)\n/g, '```$1\n');

                  actualAgentResponse = response;
                  isAgentResponse = true;

                  // Try to extract and format the JSON
                  const dictMatch = rawContent.match(pattern.dictRegex);
                  if (dictMatch && dictMatch[1]) {
                    try {
                      // Format the Python dict as JSON
                      const formattedDict = formatPythonDictAsJson(dictMatch[1]);
                      if (formattedDict) {
                        formattedJson = formattedDict;
                        isJson = true;

                        // Create a cleaner debug output with collapsible sections
                        debugInfo = `<details>
<summary>Debug Information</summary>

\`\`\`json
${formattedJson}
\`\`\`
</details>`;
                      }
                    } catch (err) {
                      console.error(`[AgentTerminal ${agentId}] Error formatting dict:`, err);
                    }
                  }

                  break; // Stop after first successful match
                }
              }

              // If we couldn't extract the response, use a fallback
              if (!actualAgentResponse) {
                console.log(`[AgentTerminal ${agentId}] Using fallback extraction for agent response`);

                // Look for the data field in the raw content
                const dataFieldMatch = rawContent.match(/'data':\s*['"]([^]*?)['"],/);
                if (dataFieldMatch && dataFieldMatch[1]) {
                  // Found the data field, use it as the response
                  let response = dataFieldMatch[1]
                    .replace(/\\n/g, '\n')
                    .replace(/\\'/g, "'")
                    .replace(/\\"/g, '"')
                    .replace(/\\t/g, '  ')
                    .trim();

                  // Apply the same formatting as above
                  response = response.replace(/^(\d+)\.\s+/gm, '$1. ');
                  response = response.replace(/^-\s*/gm, '- ');
                  response = response.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
                  response = response.replace(/^([A-Z][A-Za-z\s]+):$/gm, '## $1');

                  actualAgentResponse = response;
                  isAgentResponse = true;
                } else {
                  // Look for any text that looks like a response
                  const fallbackMatch = rawContent.match(/I have|I can|Here|Let me|The|This|[A-Z][a-z]{2,} [a-z]{2,}/);
                  if (fallbackMatch) {
                    // Take everything from the match to the end
                    const startIndex = rawContent.indexOf(fallbackMatch[0]);
                    let response = rawContent.substring(startIndex)
                      .replace(/\\n/g, '\n')
                      .replace(/\\'/g, "'")
                      .replace(/\\"/g, '"')
                      .trim();

                    // Apply the same formatting
                    response = response.replace(/^(\d+)\.\s+/gm, '$1. ');
                    response = response.replace(/^-\s*/gm, '- ');
                    response = response.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');

                    actualAgentResponse = response;
                    isAgentResponse = true;
                  } else {
                    // Last resort: just clean up the raw content
                    let cleanedContent = rawContent
                      .replace(/Result type:[^]*?Result dir:[^]*?\n/g, '')
                      .replace(/Agent result:[^]*?\n/g, '')
                      .replace(/Result dict:[^]*?\n/g, '')
                      .replace(/\n{3,}/g, '\n\n')
                      .trim();

                    // Try to find any markdown-like content
                    if (cleanedContent.includes('\n1.') ||
                        cleanedContent.includes('\n- ') ||
                        cleanedContent.includes('\n## ')) {
                      // This looks like it might contain markdown
                      actualAgentResponse = cleanedContent;
                    } else {
                      // Format it as markdown
                      actualAgentResponse = cleanedContent
                        .split('\n\n')
                        .map((para: string) => para.trim())
                        .join('\n\n');
                    }

                    isAgentResponse = true;
                  }
                }
              }

              // Add the actual agent response as a separate message
              if (actualAgentResponse) {
                setOutput(prev => [
                  ...prev,
                  {
                    id: Date.now().toString() + '-agent-response',
                    type: 'agent-response',
                    content: actualAgentResponse + (debugInfo ? '\n\n' + debugInfo : ''),
                    isMarkdown: true,
                    isJson: false,
                    isCode: false,
                    timestamp: new Date(),
                  },
                ]);
              }
            } else {
              // Handle normal content (not AgentRunResult debug output)

              // Determine if this is likely a markdown response from the agent
              isAgentResponse = data.type === 'stdout' &&
                (rawContent.includes('##') ||
                 rawContent.includes('```') ||
                 rawContent.includes('*') ||
                 rawContent.includes('- ') ||
                 rawContent.includes('1.') ||
                 rawContent.includes('Agent:'));

              // Determine if this is JSON content
              try {
                // Check if the content is already a string representation of JSON
                if (typeof rawContent === 'string' &&
                    (rawContent.trim().startsWith('{') || rawContent.trim().startsWith('[')) &&
                    (rawContent.trim().endsWith('}') || rawContent.trim().endsWith(']'))) {
                  // Try to parse and then stringify with indentation
                  const jsonObj = JSON.parse(rawContent);
                  formattedJson = JSON.stringify(jsonObj, null, 2);
                  isJson = true;
                }
              } catch (err) {
                // Not valid JSON, that's fine
                isJson = false;
              }

              // Determine if this is code content
              const isCode = rawContent.includes('```') ||
                            (data.type === 'stdout' && rawContent.includes('function ')) ||
                            (data.type === 'stdout' && rawContent.includes('class ')) ||
                            (data.type === 'stdout' && rawContent.includes('import '));

              // Check if this is an agent response by looking for common patterns
              const looksLikeAgentResponse =
                rawContent.includes('I can help') ||
                rawContent.includes('Here\'s') ||
                rawContent.includes('Let me') ||
                (rawContent.length > 100 && rawContent.includes('.'));

              // If this is the actual content (not debug info), add it to the output
              if (!isAgentRunResult) {
                setOutput(prev => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    type: isAgentResponse || looksLikeAgentResponse ? 'agent-response' : data.type,
                    content: isJson ? formattedJson : rawContent,
                    isMarkdown: isAgentResponse || looksLikeAgentResponse,
                    isJson: isJson,
                    isCode: isCode,
                    timestamp: new Date(),
                  },
                ]);
              }
            }

            // We no longer need to add a separate debug output since we include it in the agent response
            // Debug info is now included as a collapsible section in the agent response
          }
        } catch (err: any) {
          console.error(`[AgentTerminal ${agentId}] Error processing message:`, err);

          // Only add error to output if it's not a heartbeat message
          if (!event.data.startsWith(':')) {
            setOutput(prev => [...prev, {
              id: Date.now().toString(),
              type: 'error',
              content: `Error processing message: ${err?.message || 'Unknown error'}`,
              timestamp: new Date(),
            }]);
          }
        }
      };

      // Handle errors
      eventSource.onerror = (err) => {
        console.error(`[AgentTerminal ${agentId}] EventSource ERROR`, err);
        clearTimeout(connectionTimeoutId); // Clear the timeout

        try {
          if (eventSourceRef.current) {
            eventSourceRef.current.onmessage = null;
            eventSourceRef.current.onerror = null;
            eventSourceRef.current.onopen = null;
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        } catch (error) {
          console.error(`[AgentTerminal ${agentId}] Error closing EventSource on error:`, error);
        }

        // If we're still in the connecting phase, try to reconnect
        if (retryCountRef.current < 3) {
          console.log(`[AgentTerminal ${agentId}] Connection error, retrying...`);
          retryCountRef.current++;
          setTimeout(() => {
            connectEventSource(); // Retry with a delay
          }, 2000);
        } else {
          setError('Connection error. The agent process may have terminated or failed to connect.');
          console.log(`[AgentTerminal ${agentId}] Setting isConnected: false, isRunning: false`);
          setIsConnected(false);
          setIsConnecting(false);
          setIsRunning(false); // Treat SSE error as potentially fatal for the run
        }
      };

      // Set up a heartbeat to keep the connection alive
      const heartbeatInterval = setInterval(() => {
        if (eventSourceRef.current) {
          const lastActivity = (eventSourceRef.current as any).lastActivity || 0;
          const now = Date.now();

          // If no activity for 30 seconds, try to reconnect
          if (now - lastActivity > 30000 && isConnected) {
            console.log(`[AgentTerminal ${agentId}] No activity for 30 seconds, reconnecting...`);
            clearInterval(heartbeatInterval);

            try {
              eventSourceRef.current.onmessage = null;
              eventSourceRef.current.onerror = null;
              eventSourceRef.current.onopen = null;
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            } catch (err) {
              console.error(`[AgentTerminal ${agentId}] Error closing EventSource on heartbeat:`, err);
            }

            setIsConnected(false);
            if (retryCountRef.current < 3) {
              connectEventSource();
            } else {
              setIsConnecting(false);
              setIsRunning(false);
              setError('Connection lost. Please try reconnecting.');
              setOutput(prev => [...prev, {
                id: Date.now().toString(),
                type: 'error',
                content: 'Connection lost. Please try reconnecting.',
                timestamp: new Date(),
              }]);
            }
          }
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 10000);

      // Store the eventSource and interval for cleanup
      (eventSource as any).lastActivity = Date.now();
      (eventSource as any).heartbeatInterval = heartbeatInterval;
      processRef.current = eventSource;

    } catch (error: any) {
      console.error(`[AgentTerminal ${agentId}] Error setting up EventSource:`, error);
      setError(`Error connecting to agent: ${error?.message || 'Unknown error'}`);
      setIsConnecting(false);
      setIsRunning(false);

      setOutput(prev => [...prev, {
        id: Date.now().toString(),
        type: 'error',
        content: `Error connecting to agent: ${error?.message || 'Unknown error'}`,
        timestamp: new Date(),
      }]);
    }
  };

  const sendInput = async () => {
    console.log(`[AgentTerminal ${agentId}] sendInput called - isConnected: ${isConnected}, isRunning: ${isRunning}, input: ${userInput.substring(0, 20)}${userInput.length > 20 ? '...' : ''}`);

    if (!userInput.trim() || !isConnected || !isRunning || isSending) {
      console.log(`[AgentTerminal ${agentId}] Cannot send input - conditions not met`);
      return;
    }

    const currentInput = userInput;
    setUserInput(""); // Clear input immediately for better UX
    setIsSending(true); // Set sending state to true

    // Optimistically display the user's input
    setOutput(prev => [
      ...prev,
      {
        id: Date.now().toString() + '-input',
        type: 'user-input',
        content: currentInput,
        timestamp: new Date(),
      },
    ]);

    try {
      console.log(`[AgentTerminal ${agentId}] Sending input to API: ${currentInput.substring(0, 20)}${currentInput.length > 20 ? '...' : ''}`);

      const response = await fetch('/api/agent/input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId, input: currentInput }),
      });

      console.log(`[AgentTerminal ${agentId}] Input API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[AgentTerminal ${agentId}] Input API error:`, errorData);
        throw new Error(errorData.error || 'Failed to send input to agent');
      }

      const successData = await response.json();
      console.log(`[AgentTerminal ${agentId}] Input sent successfully:`, successData);

      // If there's a warning in the response, show it
      if (successData.warning) {
        setOutput(prev => [
          ...prev,
          {
            id: Date.now().toString() + '-warning',
            type: 'system',
            content: `Warning: ${successData.warning}`,
            timestamp: new Date(),
          },
        ]);
      }

    } catch (error) {
      console.error(`[AgentTerminal ${agentId}] Error sending input:`, error);

      // Show error message
      setError(`Failed to send input: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Add error message to output
      setOutput(prev => [
        ...prev,
        {
          id: Date.now().toString() + '-send-error',
          type: 'error',
          content: `Error sending input: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);

      // If the connection seems to be lost, update the status
      if (error instanceof Error &&
          (error.message.includes('not found') ||
           error.message.includes('has exited') ||
           error.message.includes('not running'))) {
        console.log(`[AgentTerminal ${agentId}] Agent appears to be disconnected, updating status`);
        setIsConnected(false);
        setIsRunning(false);
      }
    } finally {
      setIsSending(false); // Reset sending state regardless of outcome
    }
  };

  const copyOutputToClipboard = () => {
    const plainText = output
      .map(line => `[${line.timestamp.toLocaleTimeString()}] ${line.content}`)
      .join('\n');

    navigator.clipboard.writeText(plainText)
      .then(() => {
        // Show a temporary notification
        setOutput(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'system',
            content: 'Output copied to clipboard',
            timestamp: new Date(),
          },
        ]);
      })
      .catch(err => {
        console.error('Failed to copy output:', err);
      });
  };

  const downloadOutput = () => {
    const plainText = output
      .map(line => `[${line.timestamp.toLocaleTimeString()}] ${line.type}: ${line.content}`)
      .join('\n');

    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${agentId}-output-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full h-full bg-[#020618] flex flex-col border-2" style={{ borderColor: accentColor }}>
      <div className="p-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" style={{ color: accentColor }} />
          <span className="font-medium">
            Agent Terminal: {agentId}
          </span>
          {isConnecting && (
            <span className="flex items-center gap-1 text-yellow-400 text-xs">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Connecting...
            </span>
          )}
          {isRunning && isConnected && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
          {!isRunning && !isConnecting && (
            <span className="text-red-400 text-xs">Disconnected</span>
          )}
        </div>
        <div className="flex gap-2">
          {!isConnected && !isConnecting && (
            <Button
              variant="outline"
              size="sm"
              onClick={startAgent}
              title="Reconnect to agent"
              className="text-xs h-8 px-2"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : null}
              Reconnect
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={copyOutputToClipboard}
            title="Copy output to clipboard"
          >
            <ClipboardCopy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={downloadOutput}
            title="Download output"
          >
            <FileDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Close terminal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 h-0">
        <ScrollArea className="p-4 font-mono text-sm bg-black text-white h-full" ref={scrollAreaRef}>
          <div className="space-y-3">
            {output.map((line, i) => (
            <div key={line.id + '-' + i} className={`break-words ${
              line.type === 'stderr' || line.type === 'error' ? 'text-red-400' :
              line.type === 'module-error' || line.type === 'import-error' || line.type === 'file-error' ? 'text-yellow-300 font-bold' :
              line.type === 'system' ? 'text-blue-400' :
              line.type === 'user-input' ? 'bg-blue-950/30 p-2 rounded border-l-2 border-blue-500' :
              line.type === 'agent-response' ? 'bg-gray-900/50 p-3 rounded' :
              ''
            }`}>
              {/* Timestamp for all except user input and agent responses */}
              {!['user-input', 'agent-response'].includes(line.type) && (
                <span className="text-gray-500">[{line.timestamp.toLocaleTimeString()}]</span>
              )}

              {/* User input with icon */}
              {line.type === 'user-input' && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-1 text-blue-400" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">You</div>
                    <div className="whitespace-pre-wrap">{line.content}</div>
                  </div>
                </div>
              )}

              {/* Agent response with markdown */}
              {line.type === 'agent-response' && (
                <div className="flex items-start gap-2">
                  <Terminal className="h-4 w-4 mt-1 text-green-400" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Agent</div>
                    {line.isMarkdown ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            // Enhance pre elements (code blocks)
                            pre: ({ node, ...props }: any) => (
                              <pre className="bg-gray-900 rounded-md p-2 overflow-auto my-4" {...props} />
                            ),
                            // Enhance code elements
                            code: ({ node, inline, className, children, ...props }: any) => (
                              inline ?
                                <code className="bg-gray-800 px-1 py-0.5 rounded text-yellow-300" {...props}>{children}</code> :
                                <code className={`${className || ''} block`} {...props}>{children}</code>
                            ),
                            // Enhance paragraphs
                            p: ({ node, ...props }: any) => (
                              <p className="my-3" {...props} />
                            ),
                            // Enhance headings
                            h1: ({ node, ...props }: any) => (
                              <h1 className="text-xl font-bold mt-6 mb-3 pb-1 border-b border-gray-700" {...props} />
                            ),
                            h2: ({ node, ...props }: any) => (
                              <h2 className="text-lg font-bold mt-5 mb-2" {...props} />
                            ),
                            h3: ({ node, ...props }: any) => (
                              <h3 className="text-md font-bold mt-4 mb-2" {...props} />
                            ),
                            // Enhance lists
                            ul: ({ node, ...props }: any) => (
                              <ul className="list-disc pl-6 my-3 space-y-1" {...props} />
                            ),
                            ol: ({ node, ...props }: any) => (
                              <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />
                            ),
                            li: ({ node, ...props }: any) => (
                              <li className="my-1" {...props} />
                            ),
                            // Enhance blockquotes
                            blockquote: ({ node, ...props }: any) => (
                              <blockquote className="border-l-4 border-gray-500 pl-4 italic my-3" {...props} />
                            ),
                            // Enhance details/summary
                            details: ({ node, ...props }: any) => (
                              <details className="border border-gray-700 rounded-md p-2 my-3" {...props} />
                            ),
                            summary: ({ node, ...props }: any) => (
                              <summary className="font-bold cursor-pointer" {...props} />
                            ),
                          }}
                        >
                          {line.content}
                        </ReactMarkdown>
                      </div>
                    ) : line.isJson ? (
                      <pre className="bg-gray-900 p-2 rounded-md overflow-auto text-green-300">{line.content}</pre>
                    ) : line.isCode ? (
                      <pre className="bg-gray-900 p-2 rounded-md overflow-auto text-yellow-300">{line.content}</pre>
                    ) : (
                      <div className="whitespace-pre-wrap">{line.content}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Standard output for other types */}
              {!['user-input', 'agent-response'].includes(line.type) && (
                <span className="whitespace-pre-wrap ml-1">{line.content}</span>
              )}
            </div>
          ))}

          {error && (
            <Alert variant="destructive" className="my-2 bg-red-900/30 border-red-800">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                {error && error.includes('ModuleNotFoundError') && (
                  <div className="mt-2 text-yellow-300 text-xs">
                    <strong>Hint:</strong> This is likely a Python module path issue. Try editing the agent code to include:
                    <pre className="mt-1 p-2 bg-black/50 rounded-md overflow-x-auto">
                      import sys, pathlib{'\n'}
                      sys.path.append(str(pathlib.Path(__file__).parent.parent.parent))
                    </pre>
                    Also make sure your config file path is:
                    <pre className="mt-1 p-2 bg-black/50 rounded-md overflow-x-auto">
                      SCRIPT_DIR = pathlib.Path(__file__).parent.parent.parent{'\n'}
                      CONFIG_FILE = SCRIPT_DIR / "mcp_config.json"
                    </pre>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 bg-primary/80 hover:bg-primary shadow-md"
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="p-3 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendInput();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Input
              value={userInput}
              onChange={(e) => {
                // Simple value update without any side effects
                setUserInput(e.target.value);
              }}
              placeholder={
                isConnecting ? "Connecting to agent..." :
                !isConnected ? "Agent not connected..." :
                !isRunning ? "Agent not running..." :
                isSending ? "Sending message..." :
                "Type your message to the agent..."
              }
              disabled={isConnecting || !isConnected || !isRunning || isSending}
              className={`font-mono ${isSending ? 'pr-8' : ''}`}
              // Simplify the key down handler to avoid potential issues
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConnected && isRunning && userInput.trim() && !isSending && !isConnecting) {
                  e.preventDefault();
                  // Use a timeout to avoid potential race conditions
                  setTimeout(() => {
                    sendInput();
                  }, 0);
                }
              }}
            />
            {isSending && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <Button
            type="submit"
            variant="outline"
            // Remove onClick handler to avoid duplicate submissions
            disabled={isConnecting || !isConnected || !isRunning || !userInput.trim() || isSending}
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}