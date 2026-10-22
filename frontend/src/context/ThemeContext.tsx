"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useTheme as useNextTheme } from "next-themes";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  useEffect(() => {
    // Keep client state aligned with the pre-hydration theme from layout script
    const savedTheme = localStorage.getItem("stellar-market-theme") as Theme | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    // Keep the 'dark' class in sync with the resolved theme so Tailwind
    // dark-mode utilities work regardless of which strategy is active (#1615).
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const currentTheme = (resolvedTheme ?? theme) as Theme | undefined;
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("stellar-market-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const activeTheme = (resolvedTheme ?? theme ?? "light") as Theme;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
