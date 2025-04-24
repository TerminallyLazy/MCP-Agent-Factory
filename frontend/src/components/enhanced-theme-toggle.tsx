"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedThemeToggleProps {
  className?: string;
}

const glowVariants = {
  light: {
    boxShadow:
      "0 0 0px 0px #fff0, 0 0 16px 4px #facc15cc, 0 0 32px 8px #fde68acc",
    transition: { duration: 0.5 },
  },
  dark: {
    boxShadow:
      "0 0 0px 0px #fff0, 0 0 16px 4px #818cf8cc, 0 0 32px 8px #6366f1cc",
    transition: { duration: 0.5 },
  },
};

const thumbVariants = {
  light: {
    x: 32,
    background:
      "radial-gradient(circle at 60% 40%, #facc15 60%, #fde68a 100%)",
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
  dark: {
    x: 0,
    background:
      "radial-gradient(circle at 60% 40%, #818cf8 60%, #6366f1 100%)",
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

const iconVariants = {
  initial: { scale: 0.7, opacity: 0, rotate: -30 },
  animate: { scale: 1, opacity: 1, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 20 } },
  exit: { scale: 0.7, opacity: 0, rotate: 30, transition: { duration: 0.15 } },
};

export function AnimatedThemeToggle({
  className,
}: AnimatedThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = theme === 'dark' ? 'dark' : 'light';

  const handleToggle = () => {
    setTheme(currentTheme === "light" ? "dark" : "light");
  };

  return (
    <motion.button
      onClick={handleToggle}
      className={cn(
        "relative flex items-center justify-center rounded-full p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "hover:bg-opacity-20 hover:backdrop-blur-sm",
        className
      )}
      whileHover="hover"
      variants={{
        hover: { scale: 1.05 },
      }}
      aria-label={`Switch to ${
        currentTheme === "light" ? "dark" : "light"
      } theme`}
    >
      <motion.div
        className="relative h-8 w-16 rounded-full bg-gradient-to-b from-base-200 to-base-300"
        variants={glowVariants}
        animate={currentTheme}
        initial={false}
      >
        <motion.div
          className="absolute inset-1 m-0.5 h-6 w-6 rounded-full"
          variants={thumbVariants}
          animate={currentTheme}
          initial={false}
        >
          <AnimatePresence mode="wait">
            {currentTheme === "light" ? (
              <motion.span
                className="absolute inset-0 flex items-center justify-center"
                key="sun"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Sun className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_6px_#facc15]" strokeWidth={2} />
              </motion.span>
            ) : (
              <motion.span
                className="absolute inset-0 flex items-center justify-center"
                key="moon"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Moon className="h-5 w-5 text-indigo-400 drop-shadow-[0_0_6px_#818cf8]" strokeWidth={2} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.button>
  );
}

export default AnimatedThemeToggle;
