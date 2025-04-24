"use client";

import React from "react";

interface MenuProps {
  children: React.ReactNode;
}

type MenuComponent = React.FC<MenuProps> & {
  Button: React.FC<{ children: React.ReactNode; className?: string }>;
  Items: React.FC<{ children: React.ReactNode; className?: string }>;
  Item: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }>;
};

export const Menu = (({ children }: MenuProps) => (
  <div className="dropdown">
    {children}
  </div>
)) as MenuComponent;

Menu.Button = ({ children, className = "" }) => (
  <label tabIndex={0} className={`btn btn-ghost gap-2 ${className}`}>
    {children}
  </label>
);

Menu.Items = ({ children, className = "" }) => (
  <ul tabIndex={0} className={`dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 ${className}`}>
    {children}
  </ul>
);

Menu.Item = ({ children, onClick, className = "" }) => (
  <li onClick={onClick} className={`hover:bg-base-200 transition-colors ${className}`}>
    {children}
  </li>
);
