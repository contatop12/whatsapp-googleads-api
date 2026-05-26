'use client'

import { useEffect, useState } from 'react'

type ConversionBarProps = {
  novo: number
  qualificado: number
  convertido: number
  totalValue: number
  total: number
}

export function ConversionBar({ novo, qualificado, convertido, totalValue, total }: ConversionBarProps) {
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 400)
    return () => clearTimeout(timer)
  }, [])

  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0')

  const segments = [
    { label: 'Novos', count: novo, color: '#F59E0B', pct: total > 0 ? (novo / total) * 100 : 0 },
    { label: 'Qualificados', count: qualificado, color: '#4067E3', pct: total > 0 ? (qualificado / total) * 100 : 0 },
    { label: 'Convertidos', count: convertido, color: '#10B981', pct: total > 0 ? (convertido / total) * 100 : 0 },
  ]

  const conversionRate = total > 0 ? ((convertido / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Funil de Conversão</span>
        <span className="text-xs font-mono text-emerald-400">{conversionRate}% convertidos</span>
      </div>

      {total === 0 ? (
        <div className="h-3 bg-zinc-800 rounded-full mb-4" />
      ) : (
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-4 flex">
          {segments.map((seg) => (
            <div
              key={seg.label}
              style={{
                width: filled ? `${seg.pct}%` : '0%',
                backgroundColor: seg.color,
                transition: 'width 1000ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{seg.label}</span>
            </div>
            <span className="text-lg font-bold font-mono text-zinc-100">{seg.count}</span>
            <span className="text-[10px] text-zinc-600">{pct(seg.count)}%</span>
          </div>
        ))}
      </div>

      {totalValue > 0 && (
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-600 uppercase tracking-wider">Valor Convertido Total</span>
          <span className="text-lg font-bold font-mono text-emerald-400">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}
