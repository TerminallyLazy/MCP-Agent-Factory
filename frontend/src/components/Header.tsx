"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "@/ui/switch";
import { Menu } from "@/ui/menu";
import { ChevronDown, Sun, Moon } from "lucide-react";

interface HeaderProps {
  servers: string[];
}

export function Header({ servers }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="w-full flex items-center justify-between p-4 bg-base-100 shadow-lg">
      <div className="flex items-center gap-4">
        {/* MCP Server Toggles */}
        {servers.map((s) => (
          <div key={s} className="flex items-center gap-2">
            <Switch id={s} />
            <span className="capitalize">{s}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {/* Tools Dropdown */}
        <Menu>
          <Menu.Button className="btn btn-ghost">
            Tools <ChevronDown className="ml-1 w-4 h-4" />
          </Menu.Button>
          <Menu.Items className="dropdown-content bg-base-200 p-2 rounded-lg shadow-lg">
            {/* Placeholder -- populate dynamically */}
            <Menu.Item className="p-2 hover:bg-base-300 rounded">ExampleTool()</Menu.Item>
          </Menu.Items>
        </Menu>
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="btn btn-circle btn-ghost"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

export default Header;
