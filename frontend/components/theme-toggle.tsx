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
      className="relative h-9 w-9 hover:bg-secondary transition-all duration-400"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' && <Sun className="size-5 text-t2" />}
      {theme === 'light' && <Moon className="size-5 text-t2" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
