import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { THEME_KEY } from "../../lib/constants";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Sync local state on mount
    const isDarkTheme = document.documentElement.classList.contains("dark");
    setIsDark(isDarkTheme);
  }, []);

  function handleToggle() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem(THEME_KEY || "prepai.theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(THEME_KEY || "prepai.theme", "light");
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`w-[34px] h-[34px] rounded-full flex items-center justify-center transition-colors hover:bg-surface-2 text-text-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-warning" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
