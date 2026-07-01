'use client'

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'yellow' | 'orange' | 'green' | 'blue' | 'pink' | 'purple' | 'white'
  size?: 'sm' | 'md' | 'lg'
}

export const NeoButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'yellow', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-mono font-bold uppercase border-3 border-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-hover select-none cursor-pointer'
    
    const variants = {
      yellow: 'bg-neo-yellow text-black shadow-neo hover:bg-neo-yellow/90',
      orange: 'bg-neo-orange text-white shadow-neo hover:bg-neo-orange/90',
      green: 'bg-neo-green text-black shadow-neo hover:bg-neo-green/90',
      blue: 'bg-neo-blue text-white shadow-neo hover:bg-neo-blue/90',
      pink: 'bg-neo-pink text-black shadow-neo hover:bg-neo-pink/90',
      purple: 'bg-neo-purple text-white shadow-neo hover:bg-neo-purple/90',
      white: 'bg-white text-black shadow-neo hover:bg-neutral-100',
    }

    const sizes = {
      sm: 'px-4 py-1.5 text-xs',
      md: 'px-6 py-2.5 text-sm',
      lg: 'px-8 py-3.5 text-base',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

NeoButton.displayName = 'NeoButton'
