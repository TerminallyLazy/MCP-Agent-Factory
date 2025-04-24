"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedThemeToggle } from "@/components/enhanced-theme-toggle";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  ChevronDown, 
  Plus, 
  Server, 
  Wifi, 
  WifiOff,
  Wrench,
  Zap,
  Command,
  Terminal,
  Monitor,
  ShieldCheck,
  Database
} from "lucide-react";

// Server status indicator animations
const pulseAnimation = {
  inactive: {},
  active: {
    scale: [1, 1.15, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

interface ServerToggleProps {
  serverId: string;
  serverName: string;
  isActive: boolean;
  onToggle: (serverId: string, active: boolean) => void;
}

const ServerToggle: React.FC<ServerToggleProps> = ({ 
  serverId, 
  serverName, 
  isActive, 
  onToggle 
}) => {
  // Get a consistent icon based on server name
  const getServerIcon = () => {
    const hash = serverName.charCodeAt(0) % 5;
    switch(hash) {
      case 0: return <Terminal className="h-3.5 w-3.5" />;
      case 1: return <Database className="h-3.5 w-3.5" />;
      case 2: return <Monitor className="h-3.5 w-3.5" />;
      case 3: return <ShieldCheck className="h-3.5 w-3.5" />;
      default: return <Server className="h-3.5 w-3.5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative"
    >
      <motion.div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300",
          "backdrop-blur-md border",
          isActive 
            ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]" 
            : "bg-background/40 border-border hover:bg-background/60"
        )}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.button
          onClick={() => onToggle(serverId, !isActive)}
          className="relative flex items-center gap-2 outline-none"
          aria-label={`Toggle ${serverName} server ${isActive ? 'off' : 'on'}`}
        >
          <div className="relative flex items-center justify-center">
            <motion.div 
              className={cn(
                "absolute h-2 w-2 rounded-full",
                isActive ? "bg-green-400" : "bg-red-400"  
              )}
              variants={pulseAnimation}
              initial="inactive"
              animate={isActive ? "active" : "inactive"}
            />
            <motion.div 
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                isActive 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}
              initial={false}
              animate={{ 
                rotateY: isActive ? 0 : 180,
                transition: { duration: 0.5 }
              }}
            >
              {getServerIcon()}
            </motion.div>
          </div>
          
          <div className="flex flex-col justify-center">
            <span className={cn(
              "text-sm font-medium capitalize",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}>
              {serverName}
            </span>
            
            <span className={cn(
              "text-xs",
              isActive ? "text-primary" : "text-muted-foreground/70"
            )}>
              {isActive ? "Connected" : "Offline"}
            </span>
          </div>
        </motion.button>
      </motion.div>
      
      {/* Contextual tooltip on hover */}
      <AnimatePresence>
        {!isActive && (
          <motion.div 
            className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block z-10"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs py-1 px-2 rounded shadow-lg border border-border">
              Click to activate
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface ToolsDropdownProps {
  serverId: string;
  serverName: string;
  tools: { name: string; description: string }[];
}

const ToolsDropdown: React.FC<ToolsDropdownProps> = ({ 
  serverId, 
  serverName, 
  tools 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = () => setIsOpen(false);
    document.addEventListener('click', handleClickOutside);
    
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300",
          "backdrop-blur-md border",
          isOpen 
            ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]" 
            : "bg-background/40 border-border hover:bg-background/60"
        )}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <Wrench className="h-4 w-4" />
        <span className="text-sm font-medium">Tools</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border bg-background/95 backdrop-blur-md p-3 shadow-xl"
          >
            <div className="mb-2 pb-2 border-b border-border">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-2">
                {serverName}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                Available tools: {tools.length}
              </div>
            </div>
            
            <div className="space-y-1 max-h-[300px] overflow-auto pr-1 custom-scrollbar">
              {tools.length > 0 ? (
                tools.map((tool) => (
                  <motion.div 
                    key={tool.name}
                    className="px-3 py-2 rounded-lg hover:bg-accent/50 hover:backdrop-blur-md cursor-pointer group transition-all duration-150"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-primary opacity-70 group-hover:opacity-100" />
                      <div className="font-medium text-sm group-hover:text-primary transition-colors">
                        {tool.name}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-5 mt-0.5 group-hover:text-foreground/70 transition-colors">
                      {tool.description}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-center text-muted-foreground bg-muted/50 rounded-lg">
                  <Server className="h-5 w-5 mx-auto mb-2 opacity-50" />
                  No tools available for this server
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface EnhancedHeaderProps {
  servers: { 
    id: string; 
    name: string; 
    isActive: boolean;
    tools: { name: string; description: string }[];
  }[];
  onServerToggle: (serverId: string, active: boolean) => void;
  onAddServer: () => void;
  onOpenSettings: () => void;
}

export function EnhancedHeader({
  servers,
  onServerToggle,
  onAddServer,
  onOpenSettings,
}: EnhancedHeaderProps) {
  const { theme } = useTheme();
  const [activeToolsServer, setActiveToolsServer] = useState<string | null>(null);

  // Get first active server for tools display
  const activeServer = servers.find(s => s.isActive) || null;

  return (
    <motion.div 
      className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/60 border-b border-border shadow-sm mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container flex items-center justify-between py-3 px-4">
        <div className="flex items-center gap-4">
          <motion.div
            className="flex items-center gap-2 mr-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Command className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              MCP Console
            </h1>
          </motion.div>

          <div className="flex flex-wrap gap-2 items-center">
            {servers.map((server) => (
              <ServerToggle
                key={server.id}
                serverId={server.id}
                serverName={server.name}
                isActive={server.isActive}
                onToggle={onServerToggle}
              />
            ))}

            <motion.button
              onClick={onAddServer}
              className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border border-dashed border-primary/40 bg-background/40 hover:bg-primary/5 transition-all duration-300 group"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Add Server</span>
            </motion.button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeServer?.tools && activeServer.tools.length > 0 && (
            <ToolsDropdown
              serverId={activeServer.id}
              serverName={activeServer.name}
              tools={activeServer.tools}
            />
          )}

          <AnimatedThemeToggle className="ml-auto" />

          <motion.button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 backdrop-blur-md border border-border bg-background/40 hover:bg-background/60"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline-block">Settings</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
