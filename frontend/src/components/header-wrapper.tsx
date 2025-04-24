"use client";

import { useState } from "react";
import { EnhancedHeader } from "@/components/enhanced-header";

interface HeaderWrapperProps {
  initialServers: { 
    id: string; 
    name: string; 
    tools: { name: string; description: string }[];
  }[];
}

export function HeaderWrapper({ initialServers }: HeaderWrapperProps) {
  // Convert initial servers from server props to state with isActive property
  const [servers, setServers] = useState(
    initialServers.map(server => ({
      ...server,
      isActive: false
    }))
  );
  
  const handleServerToggle = (id: string, active: boolean) => {
    console.log(`Toggle server ${id}: ${active}`);
    setServers(prev => 
      prev.map(server => 
        server.id === id ? { ...server, isActive: active } : server
      )
    );
  };
  
  const handleAddServer = () => {
    console.log('Add server clicked');
    // Would open a modal or navigate to add server page
  };
  
  const handleOpenSettings = () => {
    console.log('Settings clicked');
    // Would open settings modal or page
  };
  
  return (
    <EnhancedHeader 
      servers={servers} 
      onServerToggle={handleServerToggle}
      onAddServer={handleAddServer}
      onOpenSettings={handleOpenSettings}
    />
  );
}
