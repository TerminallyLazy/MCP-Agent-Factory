"use client";

import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CornerDownLeft, Paperclip, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  onAttachFile?: () => void;
  onMicrophoneClick?: () => void;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = "Type a message...",
  className,
  onAttachFile,
  onMicrophoneClick,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input);
      setInput("");
    }
  };

  // Auto resize the textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  // Handle Ctrl+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative flex w-full flex-col rounded-xl border bg-background p-4 shadow-lg transition-all focus-within:shadow-xl dark:shadow-lg dark:shadow-primary/5 dark:focus-within:shadow-primary/10",
        className
      )}
    >
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className="min-h-24 max-h-[50vh] border-0 px-2 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex space-x-2">
          {onAttachFile && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={onAttachFile}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
          {onMicrophoneClick && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={onMicrophoneClick}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            type="submit"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? "Sending..." : "Send"}
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </form>
  );
}
