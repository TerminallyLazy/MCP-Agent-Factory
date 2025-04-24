"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ToolCall } from "@/types/mcp";

export interface ChatBubbleProps {
  children: React.ReactNode;
  isUser?: boolean;
  className?: string;
  timestamp?: string | Date;
  isLoading?: boolean;
  toolCalls?: ToolCall[];
}

export function ChatBubble({
  children,
  isUser = false,
  className,
  timestamp,
  isLoading,
  toolCalls,
}: ChatBubbleProps) {
  const formattedDate = timestamp 
    ? new Date(timestamp).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <div className={cn("flex max-w-3xl", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className="flex flex-col px-4 py-2 space-y-2">
          <div className={cn(
            "rounded-2xl px-4 py-3",
            isUser 
              ? "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/30 transition-shadow" 
              : "bg-base-200 text-base-content shadow-md"
          )}>
            {children}
          </div>
          {toolCalls && toolCalls.length > 0 && !isUser && (
            <div className="mt-2 space-y-2">
              {toolCalls.map((tool, idx) => (
                <div key={idx} className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs">
                  <div className="font-semibold">Tool: {tool.name}</div>
                  <div className="font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                    {JSON.stringify(tool.args, null, 2)}
                  </div>
                  {tool.result && (
                    <div className="mt-1 pt-1 border-t border-base-300">
                      <div className="font-semibold">Result:</div>
                      <div className="font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                        {typeof tool.result === 'object' 
                          ? JSON.stringify(tool.result, null, 2)
                          : tool.result}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {formattedDate && (
            <div className={cn(
              "text-xs opacity-70",
              isUser ? "text-right" : "text-left"
            )}>
              {formattedDate}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export interface ChatBubbleAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  isUser?: boolean;
}

export function ChatBubbleAvatar({
  src,
  alt = "Avatar",
  fallback,
  className,
  isUser = false,
}: ChatBubbleAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", isUser ? "ml-2" : "mr-2", className)}>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{fallback || (isUser ? "U" : "AI")}</AvatarFallback>
    </Avatar>
  );
}

export interface ChatBubbleMessageProps {
  children: React.ReactNode;
  className?: string;
}

export function ChatBubbleMessage({
  children,
  className,
}: ChatBubbleMessageProps) {
  return <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>{children}</div>;
}
