'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        console.log('Theme toggle clicked! Current theme:', theme)
        toggleTheme()
      }}
      className="relative"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Show Sun icon in dark mode (click to go to light) */}
      {theme === 'dark' && <Sun className="size-5" />}
      {/* Show Moon icon in light mode (click to go to dark) */}
      {theme === 'light' && <Moon className="size-5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
