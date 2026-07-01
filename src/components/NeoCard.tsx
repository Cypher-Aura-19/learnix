import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'yellow' | 'orange' | 'green' | 'blue' | 'pink' | 'purple' | 'white'
  title?: string
}

export const NeoCard: React.FC<CardProps> = ({
  className = '',
  variant = 'white',
  title,
  children,
  ...props
}) => {
  const variants = {
    yellow: 'bg-neo-yellow text-black',
    orange: 'bg-neo-orange text-white',
    green: 'bg-neo-green text-black',
    blue: 'bg-neo-blue text-white',
    pink: 'bg-neo-pink text-black',
    purple: 'bg-neo-purple text-white',
    white: 'bg-white text-black',
  }

  return (
    <div
      className={`border-3 border-black shadow-neo-lg p-6 font-mono ${variants[variant]} ${className}`}
      {...props}
    >
      {title && (
        <h3 className="text-xl font-black uppercase tracking-wider border-b-3 border-black pb-2 mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
