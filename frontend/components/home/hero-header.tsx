'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

type HeroHeaderProps = {
  tenantName: string
}

export function HeroHeader({ tenantName }: HeroHeaderProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 px-8 py-7"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #4067E3 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="pointer-events-none absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#4067E3]/10 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Image
            src="/logo-gzapi.svg"
            alt="GZAPI"
            width={140}
            height={34}
            className="opacity-90"
            priority
          />
          <div className="w-px h-10 bg-zinc-700" />
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Bem-vindo</p>
            <p className="text-lg font-bold text-zinc-100 tracking-tight">{tenantName}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-zinc-500 font-mono">SISTEMA ONLINE</span>
        </div>
      </div>
    </div>
  )
}
