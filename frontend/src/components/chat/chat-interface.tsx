"use client";

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { Bot, User } from "lucide-react";
import type { ChatMessage, ToolCall } from "@/types/mcp";
import { motion } from "framer-motion";

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => Promise<ChatMessage>;
  initialMessages?: ChatMessage[];
  className?: string;
}

export function ChatInterface({
  onSendMessage,
  initialMessages = [],
  className,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    
    try {
      if (onSendMessage) {
        const response = await onSendMessage(content);
        setMessages((prev) => [...prev, response]);
      } else {
        // Demo mode - simulate assistant response
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        const demoResponse: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: "I'm just a demo response. Connect this component to your backend to get real MCP responses!",
          timestamp: new Date(),
          toolCalls: [
            {
              name: "exampleTool",
              args: { param1: "value1", param2: 42 },
              status: "success",
              result: "Example tool result"
            }
          ]
        };
        
        setMessages((prev) => [...prev, demoResponse]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: "assistant",
          content: "Sorry, there was an error processing your request.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`h-full overflow-hidden flex flex-col shadow-lg ${className}`}>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-hidden">
            <ChatMessageList messages={messages} loading={loading}>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </ChatMessageList>
          </div>
          <div className="p-4 pt-0">
            <ChatInput
              onSubmit={handleSendMessage}
              isLoading={loading}
              placeholder="Send a message..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChatMessageProps {
  message: ChatMessage;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ChatBubble 
        isUser={isUser} 
        timestamp={message.timestamp}
        toolCalls={message.toolCalls}
      >
        <div className="flex gap-3">
          <ChatBubbleAvatar
            isUser={isUser}
            fallback={isUser ? "U" : "AI"}
          />
          <ChatBubbleMessage>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <div className="relative group">
                      <pre className={`${className} rounded-md p-3 overflow-auto`} {...props}>
                        <code className={`language-${match[1]}`}>{children}</code>
                      </pre>
                    </div>
                  ) : (
                    <code className="bg-muted rounded px-1 py-0.5" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </ChatBubbleMessage>
        </div>
      </ChatBubble>
    </motion.div>
  );
}

export default ChatInterface;
