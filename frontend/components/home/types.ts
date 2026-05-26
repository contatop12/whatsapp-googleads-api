export type HomeStats = {
  novo: number
  qualificado: number
  convertido: number
  hoje: number
  totalValue: number
  total: number
}

export type RecentLead = {
  id: string
  name: string | null
  phone: string
  stage: 1 | 2 | 3
  created_at: string
}
