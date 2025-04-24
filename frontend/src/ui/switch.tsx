"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode
  description?: React.ReactNode
  className?: string
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, className, disabled, ...props }, ref) => {
    const id = React.useId()
    return (
      <label
        htmlFor={id}
        className={cn(
          "group flex items-center gap-3 cursor-pointer select-none",
          disabled && "opacity-70 cursor-not-allowed",
          className
        )}
      >
        <span className="relative inline-flex items-center">
          <input
            id={id}
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              "block h-6 w-11 rounded-full border-2 border-transparent transition-colors",
              "bg-base-200 data-[checked=true]:bg-primary",
              "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
              "peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
            )}
            data-checked={props.checked || props.defaultChecked ? "true" : undefined}
          >
            <span
              className={cn(
                "pointer-events-none block h-5 w-5 rounded-full bg-base-100 shadow-lg ring-0 transition-transform",
                "translate-x-0 peer-checked:translate-x-5"
              )}
            />
          </span>
        </span>
        {(label || description) && (
          <span className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-base-content">{label}</span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </span>
        )}
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
