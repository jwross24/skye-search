'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Admin AI Health card — probes /api/admin/health/anthropic on mount and
 * surfaces whether the Anthropic API key is valid + reachable. Designed to
 * make a stale/placeholder ANTHROPIC_API_KEY visible within minutes instead
 * of weeks (the original 32-day silent failure was the trigger for this).
 */

type AiHealthState =
  | { status: 'loading' }
  | { status: 'ok'; latency_ms: number; checked_at: string }
  | {
      status: 'error'
      reason: 'invalid_key' | 'rate_limited' | 'network' | 'unknown' | 'fetch_failed'
      checked_at: string
    }

interface ProbeResponse {
  ok: boolean
  error?: string
  latency_ms: number
  checked_at: string
}

const REASON_LABEL: Record<Exclude<AiHealthState, { status: 'loading' | 'ok' }>['reason'], string> = {
  invalid_key: 'AI: invalid key',
  rate_limited: 'AI: rate-limited',
  network: 'AI: unreachable',
  unknown: 'AI: error',
  fetch_failed: 'AI: probe failed',
}

const REASON_DOT_COLOR: Record<
  Exclude<AiHealthState, { status: 'loading' | 'ok' }>['reason'],
  string
> = {
  // invalid key is the biggest deal — flag it red so it pings.
  invalid_key: 'bg-rose-400',
  // rate limit is transient, network is recoverable, both amber.
  rate_limited: 'bg-amber-400',
  network: 'bg-amber-400',
  unknown: 'bg-amber-400',
  fetch_failed: 'bg-amber-400',
}

function StatusDot({ color, pulsing }: { color: string; pulsing: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75 ${
          pulsing ? 'animate-ping' : ''
        }`}
      />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  )
}

function formatCheckedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString()
  } catch {
    return iso
  }
}

export function AiHealth() {
  const [state, setState] = useState<AiHealthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function probe() {
      try {
        const res = await fetch('/api/admin/health/anthropic')
        const data = (await res.json()) as ProbeResponse
        if (cancelled) return

        if (data.ok) {
          setState({ status: 'ok', latency_ms: data.latency_ms, checked_at: data.checked_at })
          return
        }

        const reason =
          data.error === 'invalid_key' ||
          data.error === 'rate_limited' ||
          data.error === 'network'
            ? data.error
            : 'unknown'
        setState({ status: 'error', reason, checked_at: data.checked_at })
      } catch {
        if (cancelled) return
        setState({
          status: 'error',
          reason: 'fetch_failed',
          checked_at: new Date().toISOString(),
        })
      }
    }

    probe()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24 bg-zinc-800" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 bg-zinc-800" />
          <Skeleton className="h-3 w-40 mt-2 bg-zinc-800" />
        </CardContent>
      </Card>
    )
  }

  if (state.status === 'ok') {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <StatusDot color="bg-emerald-400" pulsing={false} />
            <CardTitle className="text-sm font-medium text-zinc-400">Anthropic API</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono font-semibold tracking-tight text-zinc-100">AI: ok</p>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            {state.latency_ms}ms · checked {formatCheckedAt(state.checked_at)}
          </p>
        </CardContent>
      </Card>
    )
  }

  // error state
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <StatusDot color={REASON_DOT_COLOR[state.reason]} pulsing={state.reason === 'invalid_key'} />
          <CardTitle className="text-sm font-medium text-zinc-400">Anthropic API</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-mono font-semibold tracking-tight text-zinc-100">
          {REASON_LABEL[state.reason]}
        </p>
        <p className="text-xs text-zinc-500 mt-1 font-mono">
          checked {formatCheckedAt(state.checked_at)}
        </p>
      </CardContent>
    </Card>
  )
}
