import React from 'react'

interface CourseCoverProps {
  category?: string
  title?: string
  icon?: string
  className?: string
}

export default function CourseCover({ category = '', title = '', icon = '', className = '' }: CourseCoverProps) {
  const cleanCategory = category.replace('Draft|', '').trim().toLowerCase()
  const cleanTitle = title.trim().toLowerCase()

  // 0. If an explicit icon URL is provided (e.g. from template or DB), use it!
  if (icon && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:'))) {
    const sizeClass = className ? 'h-full' : 'aspect-[4/3]'
    return (
      <div className={`w-full ${sizeClass} border-b-2 border-black overflow-hidden bg-neutral-100 relative ${className}`}>
        <img
          src={icon}
          alt={title || 'Course Cover'}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  // 1. If we have a local generated png image, use it!
  if (cleanCategory === 'data science') {
    const sizeClass = className ? 'h-full' : 'aspect-[4/3]'
    return (
      <div className={`w-full ${sizeClass} border-b-2 border-black overflow-hidden bg-[#e8f5e9] relative ${className}`}>
        <img
          src="/course_covers/ds_cover.png"
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  if (cleanCategory === 'design' && cleanTitle.includes('ui/ux')) {
    const sizeClass = className ? 'h-full' : 'aspect-[4/3]'
    return (
      <div className={`w-full ${sizeClass} border-b-2 border-black overflow-hidden bg-[#e3f2fd] relative ${className}`}>
        <img
          src="/course_covers/ui_cover.png"
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  if (cleanCategory === 'marketing' && cleanTitle.includes('marketing masterclass')) {
    const sizeClass = className ? 'h-full' : 'aspect-[4/3]'
    return (
      <div className={`w-full ${sizeClass} border-b-2 border-black overflow-hidden bg-[#fffde7] relative ${className}`}>
        <img
          src="/course_covers/marketing_cover.png"
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  // 2. High fidelity, premium neobrutalist dynamic SVG covers for all other courses!
  let bg = 'bg-neo-yellow'
  let svgContent = null

  if (cleanCategory === 'development' || cleanCategory === 'software') {
    bg = 'bg-[#00ea8c]' // bright green
    svgContent = (
      <svg className="w-full h-full" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dev-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="black" strokeWidth="0.5" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="200" height="150" fill="url(#dev-grid)" />
        
        {/* Decorative background shape */}
        <circle cx="170" cy="30" r="35" fill="#ffd200" stroke="black" strokeWidth="2.5" />
        <polygon points="10,130 40,80 60,120" fill="#ff7675" stroke="black" strokeWidth="2.5" />
        
        {/* Code Editor Window */}
        <g transform="translate(25, 25)" className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          {/* Main frame */}
          <rect width="150" height="100" rx="6" fill="#1e1e24" stroke="black" strokeWidth="3" />
          
          {/* Header Bar */}
          <path d="M 0 6 A 6 6 0 0 1 6 0 L 144 0 A 6 6 0 0 1 150 6 L 150 20 L 0 20 Z" fill="#2d2d35" stroke="black" strokeWidth="3" />
          
          {/* Window controls */}
          <circle cx="12" cy="10" r="3.5" fill="#ff5f56" stroke="black" strokeWidth="1" />
          <circle cx="24" cy="10" r="3.5" fill="#ffbd2e" stroke="black" strokeWidth="1" />
          <circle cx="36" cy="10" r="3.5" fill="#27c93f" stroke="black" strokeWidth="1" />
          <text x="75" y="14" fontFamily="monospace" fontSize="8" fontWeight="bold" fill="#888" textAnchor="middle">index.tsx</text>

          {/* Code lines layout */}
          {/* Row 1: import react */}
          <rect x="10" y="32" width="35" height="4" rx="2" fill="#ff7675" />
          <rect x="50" y="32" width="20" height="4" rx="2" fill="#74b9ff" />
          <rect x="75" y="32" width="30" height="4" rx="2" fill="#a29bfe" />

          {/* Row 2: const App = () => { */}
          <rect x="10" y="44" width="25" height="4" rx="2" fill="#fdcb6e" />
          <rect x="40" y="44" width="20" height="4" rx="2" fill="#0984e3" />
          <rect x="65" y="44" width="35" height="4" rx="2" fill="#00cec9" />

          {/* Row 3: return ( */}
          <rect x="20" y="56" width="30" height="4" rx="2" fill="#e84393" />

          {/* Row 4: <div className="app"> */}
          <rect x="30" y="68" width="8" height="4" rx="2" fill="#ffeaa7" />
          <rect x="42" y="68" width="40" height="4" rx="2" fill="#55efc4" />
          <rect x="86" y="68" width="10" height="4" rx="2" fill="#ffeaa7" />

          {/* Cursor */}
          <rect x="98" y="66" width="2" height="8" fill="#fff" />

          {/* Row 5: </div> */}
          <rect x="30" y="80" width="18" height="4" rx="2" fill="#ffeaa7" />
          
          {/* Nested tag graphics on the right */}
          <g transform="translate(112, 40)">
            <rect width="28" height="28" fill="#00ea8c" stroke="black" strokeWidth="2.5" />
            <text x="14" y="18" fontFamily="monospace" fontSize="11" fontWeight="black" fill="black" textAnchor="middle">&lt;&gt;</text>
          </g>
        </g>
      </svg>
    )
  } else if (cleanCategory === 'design') {
    bg = 'bg-[#74b9ff]' // beautiful light blue
    svgContent = (
      <svg className="w-full h-full" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="design-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="black" opacity="0.25" />
          </pattern>
        </defs>
        <rect width="200" height="150" fill="url(#design-grid)" />

        {/* Dynamic Abstract Design Grid Marks */}
        <line x1="0" y1="15" x2="200" y2="15" stroke="black" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="15" y1="0" x2="15" y2="150" stroke="black" strokeWidth="0.5" strokeDasharray="3 3" />

        {/* Vector Bezier Handles representation (Pen tool workspace) */}
        <path d="M 30 110 C 60 40, 120 40, 170 110" stroke="black" strokeWidth="3" fill="none" />
        
        {/* Main curve points */}
        <rect x="26" y="106" width="8" height="8" fill="white" stroke="black" strokeWidth="2" />
        <rect x="166" y="106" width="8" height="8" fill="white" stroke="black" strokeWidth="2" />
        
        {/* Handle control points */}
        <line x1="60" y1="40" x2="60" y2="80" stroke="black" strokeWidth="1.5" strokeDasharray="2 2" />
        <line x1="120" y1="40" x2="120" y2="80" stroke="black" strokeWidth="1.5" strokeDasharray="2 2" />
        <circle cx="60" cy="40" r="4.5" fill="#e74c3c" stroke="black" strokeWidth="1.5" />
        <circle cx="120" cy="40" r="4.5" fill="#e74c3c" stroke="black" strokeWidth="1.5" />

        {/* Graphic Design Toolbar Palette */}
        <g transform="translate(65, 45)" className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <rect width="70" height="70" fill="white" stroke="black" strokeWidth="3" />
          {/* Grid lines */}
          <line x1="0" y1="35" x2="70" y2="35" stroke="black" strokeWidth="2" />
          <line x1="35" y1="0" x2="35" y2="70" stroke="black" strokeWidth="2" />
          
          {/* Tool icons inside the palette */}
          {/* Pen tool icon */}
          <path d="M 12 12 L 25 18 L 20 20 L 25 25 L 23 27 L 18 22 L 16 25 Z" fill="black" />
          {/* Shapes icon */}
          <rect x="45" y="10" width="15" height="15" fill="#ff7675" stroke="black" strokeWidth="1.5" />
          {/* Color palette icon */}
          <circle cx="17" cy="52" r="10" fill="#fdcb6e" stroke="black" strokeWidth="1.5" />
          <circle cx="17" cy="52" r="5" fill="#00ea8c" />
          {/* Text Tool 'T' */}
          <text x="52" y="60" fontFamily="var(--font-heading), sans-serif" fontSize="16" fontWeight="900" fill="black" textAnchor="middle">T</text>
        </g>
      </svg>
    )
  } else if (cleanCategory === 'marketing') {
    bg = 'bg-[#ff7675]' // bright neon red/pink
    svgContent = (
      <svg className="w-full h-full" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="marketing-stripes" width="15" height="15" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="15" stroke="black" strokeWidth="1" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="200" height="150" fill="url(#marketing-stripes)" />
        
        {/* Background elements */}
        <circle cx="30" cy="30" r="15" fill="#a29bfe" stroke="black" strokeWidth="2" />
        <rect x="150" y="100" width="30" height="30" fill="#55efc4" stroke="black" strokeWidth="2" transform="rotate(15 165 115)" />

        {/* Growth/Megaphone graphic panel */}
        <g transform="translate(40, 30)" className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          {/* Main frame */}
          <rect width="120" height="90" fill="white" stroke="black" strokeWidth="3" />
          
          {/* Target Bullseye / Growth Bars */}
          <g transform="translate(15, 15)">
            {/* Bars chart */}
            <rect x="0" y="35" width="10" height="25" fill="#74b9ff" stroke="black" strokeWidth="2" />
            <rect x="15" y="20" width="10" height="40" fill="#fdcb6e" stroke="black" strokeWidth="2" />
            <rect x="30" y="5" width="10" height="55" fill="#00ea8c" stroke="black" strokeWidth="2" />
            
            {/* Arrow line */}
            <path d="M 2 30 L 15 15 L 32 8" stroke="black" strokeWidth="2.5" fill="none" />
            <polygon points="32,4 35,12 27,9" fill="black" />
          </g>

          {/* Megaphone vector */}
          <g transform="translate(65, 20)">
            {/* Megaphone body */}
            <path d="M 5 25 L 25 15 L 35 15 L 35 35 L 25 35 Z" fill="#ffeaa7" stroke="black" strokeWidth="2" />
            <path d="M 35 15 L 45 5 L 45 45 L 35 35 Z" fill="#ff7675" stroke="black" strokeWidth="2" />
            <rect x="10" y="30" width="8" height="15" fill="#2d2d35" stroke="black" strokeWidth="2" rx="2" />
            
            {/* Sound blast lines */}
            <path d="M 52 15 Q 58 25 52 35" stroke="black" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 58 10 Q 66 25 58 40" stroke="black" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>

          {/* Footer banner label */}
          <rect x="0" y="70" width="120" height="20" fill="#2d2d35" />
          <text x="60" y="83" fontFamily="var(--font-sans), sans-serif" fontSize="8" fontWeight="black" fill="#00ea8c" textAnchor="middle" letterSpacing="1">CAMPAIGN REACH +240%</text>
        </g>
      </svg>
    )
  } else {
    // Default fallback (Data Science / AI / General)
    bg = 'bg-[#f4d03f]' // vibrant yellow
    svgContent = (
      <svg className="w-full h-full" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="data-dots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="black" opacity="0.2" />
          </pattern>
        </defs>
        <rect width="200" height="150" fill="url(#data-dots)" />
        
        {/* Data clusters / Brain network lines */}
        <line x1="35" y1="45" x2="85" y2="75" stroke="black" strokeWidth="2" strokeDasharray="3 3" />
        <line x1="85" y1="75" x2="155" y2="35" stroke="black" strokeWidth="2" strokeDasharray="3 3" />
        <line x1="85" y1="75" x2="120" y2="120" stroke="black" strokeWidth="2" strokeDasharray="3 3" />

        <circle cx="35" cy="45" r="8" fill="#e74c3c" stroke="black" strokeWidth="2" />
        <circle cx="155" cy="35" r="10" fill="#3498db" stroke="black" strokeWidth="2" />
        <circle cx="120" cy="120" r="7" fill="#2ecc71" stroke="black" strokeWidth="2" />

        {/* Database & Brain node center graphic */}
        <g transform="translate(55, 40)" className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <rect width="90" height="70" fill="white" stroke="black" strokeWidth="3" />
          
          {/* Cylinder (Database) representation */}
          <g transform="translate(15, 15)">
            <ellipse cx="20" cy="10" rx="15" ry="5" fill="#a29bfe" stroke="black" strokeWidth="2" />
            <path d="M 5 10 L 5 22 A 15 5 0 0 0 35 22 L 35 10 Z" fill="#a29bfe" stroke="black" strokeWidth="2" />
            <path d="M 5 22 L 5 34 A 15 5 0 0 0 35 34 L 35 22 Z" fill="#74b9ff" stroke="black" strokeWidth="2" />
          </g>

          {/* Brain / AI Chip icon representation */}
          <g transform="translate(52, 18)">
            <rect x="5" y="5" width="22" height="22" rx="4" fill="#ffd200" stroke="black" strokeWidth="2" />
            {/* Pins */}
            <line x1="2" y1="10" x2="5" y2="10" stroke="black" strokeWidth="2" />
            <line x1="2" y1="16" x2="5" y2="16" stroke="black" strokeWidth="2" />
            <line x1="2" y1="22" x2="5" y2="22" stroke="black" strokeWidth="2" />
            <line x1="27" y1="10" x2="30" y2="10" stroke="black" strokeWidth="2" />
            <line x1="27" y1="16" x2="30" y2="16" stroke="black" strokeWidth="2" />
            <line x1="27" y1="22" x2="30" y2="22" stroke="black" strokeWidth="2" />
            
            {/* Brain node circle */}
            <circle cx="16" cy="16" r="5" fill="black" />
          </g>
        </g>
      </svg>
    )
  }

  // Use h-full when a custom className is provided (e.g. admin cards with fixed-height wrapper)
  const sizeClass = className ? 'h-full' : 'aspect-[4/3]'

  return (
    <div className={`w-full ${sizeClass} border-b-2 border-black overflow-hidden ${bg} relative ${className}`}>
      {svgContent}
    </div>
  )
}
