'use client'

import * as React from 'react'

type ToasterToast = {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  open?: boolean
}

const listeners: Array<(toasts: ToasterToast[]) => void> = []
let memoryState: ToasterToast[] = []

function dispatch(toasts: ToasterToast[]) {
  memoryState = toasts
  listeners.forEach((l) => l(memoryState))
}

export function toast({ title, description, variant = 'default' }: Omit<ToasterToast, 'id'>) {
  const id = String(Date.now())
  dispatch([...memoryState, { id, title, description, variant, open: true }])
  setTimeout(() => {
    dispatch(memoryState.filter((t) => t.id !== id))
  }, 4000)
}

export function useToast() {
  const [state, setState] = React.useState<ToasterToast[]>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return { toasts: state, toast }
}
