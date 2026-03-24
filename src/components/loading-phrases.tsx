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
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="size-8 animate-pulse rounded-full bg-ocean/20" />
      <p className="text-sm text-muted-foreground animate-in fade-in duration-500">
        {phrases[index]}
      </p>
    </div>
  )
}
