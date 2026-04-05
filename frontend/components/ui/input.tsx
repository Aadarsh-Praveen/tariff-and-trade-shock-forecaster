import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'text-100 placeholder:text-45 selection:bg-[#df2531] selection:text-white bg-neutral-dark border-neutral h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'hover:bg-neutral-hover hover:border-neutral-hover',
        'focus-visible:border-red-40 focus-visible:ring-[rgba(223,37,49,0.2)] focus-visible:ring-[3px]',
        'aria-invalid:ring-[rgba(223,37,49,0.4)] aria-invalid:border-[#df2531]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
