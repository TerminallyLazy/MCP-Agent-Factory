"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/types/mcp";

interface ChatMessageListProps {
  messages: ChatMessage[];
  children?: React.ReactNode;
  className?: string;
  autoScrollToBottom?: boolean;
  loading?: boolean;
}

export function ChatMessageList({
  messages,
  children,
  className,
  autoScrollToBottom = true,
  loading = false,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (autoScrollToBottom && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScrollToBottom]);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="flex flex-col gap-6 p-4 md:p-6" ref={scrollRef}>
        <AnimatePresence>
          {children || (
            messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                ref={index === messages.length - 1 ? lastMessageRef : undefined}
              >
                {/* The actual message content would be rendered here */}
              </motion.div>
            ))
          )}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center p-4"
            >
              <div className="dot-pulse">
                <div className="dot-pulse__dot"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}

// Loading animation component
function DotPulse() {
  return (
    <div className="dot-pulse">
      <div className="dot-pulse__dot"></div>
    </div>
  );
}
