'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary:   'bg-[#333] text-white hover:bg-[#111] active:bg-[#000]',
      secondary: 'bg-[#e0e0e0] text-[#333] hover:bg-[#bbbbbb]',
      ghost:     'bg-transparent text-[#555] hover:bg-[#ebebeb]',
      danger:    'bg-[#555] text-white hover:bg-[#333]',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2',
    }

    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
