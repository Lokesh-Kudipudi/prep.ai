import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  // Sync state with HTML element class list on mount
  useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains("dark");
    setIsDark(isDarkTheme);
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("prepai.theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("prepai.theme", "dark");
      setIsDark(true);
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "w-[34px] h-[34px] rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 transition-all cursor-pointer border border-transparent hover:border-border select-none",
        className
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
