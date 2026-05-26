'use client'

import { useEffect, useRef, useState } from 'react'

type StatCardProps = {
  value: number
  label: string
  icon: React.ReactNode
  color: string
  prefix?: string
  suffix?: string
  delay?: number
  decimals?: number
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function StatCard({
  value,
  label,
  icon,
  color,
  prefix = '',
  suffix = '',
  delay = 0,
  decimals = 0,
}: StatCardProps) {
  const [display, setDisplay] = useState(0)
  const [visible, setVisible] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
      const duration = 1200
      const start = performance.now()

      function tick(now: number) {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        setDisplay(easeOut(progress) * value)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setDisplay(value)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }, delay)

    return () => {
      clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, delay])

  const formatted =
    decimals > 0
      ? display.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.floor(display).toLocaleString('pt-BR')

  return (
    <div
      className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 overflow-hidden transition-all duration-300 hover:border-zinc-700 hover:-translate-y-0.5 group"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 400ms ease ${delay}ms, transform 400ms ease ${delay}ms, border-color 200ms, translate 200ms`,
        borderTopColor: color,
        borderTopWidth: '3px',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{label}</span>
        <span style={{ color }} className="opacity-70 group-hover:opacity-100 transition-opacity">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-zinc-100 font-mono tabular-nums">
        {prefix}{formatted}{suffix}
      </p>
    </div>
  )
}
