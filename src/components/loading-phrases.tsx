'use client'

import { useState, useEffect } from 'react'

const phrases = [
  'Finding companies that sponsor STEM OPT...',
  'Checking your timeline...',
  'Looking for your next opportunity...',
  'Searching cap-exempt employers...',
  'Reviewing academic positions...',
  'Matching your research background...',
]

export function LoadingPhrases() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16">
      <div className="relative flex items-center justify-center">
        <div className="absolute size-10 animate-ping rounded-full bg-ocean/5" />
        <div className="absolute size-8 animate-pulse rounded-full bg-ocean/10" style={{ animationDelay: '0.5s' }} />
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="relative size-8 text-ocean/40"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M4 20c3-2 6-1 9-2s5-3 8-2 5 2 7 1"
            strokeLinecap="round"
            className="animate-pulse"
            style={{ animationDuration: '2s' }}
          />
          <path
            d="M4 24c3-2 6-1 9-2s5-3 8-2 5 2 7 1"
            strokeLinecap="round"
            className="animate-pulse"
            style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}
          />
        </svg>
      </div>
      <p
        key={index}
        className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300"
      >
        {phrases[index]}
      </p>
    </div>
  )
}
