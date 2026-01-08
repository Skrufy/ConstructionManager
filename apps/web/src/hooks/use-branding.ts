'use client'

import useSWR from 'swr'

interface Branding {
  companyName: string
  companyLogo: string | null
  companyFavicon: string | null
}

const defaultBranding: Branding = {
  companyName: 'ConstructionPro',
  companyLogo: null,
  companyFavicon: null
}

const fetcher = async (url: string): Promise<Branding> => {
  const res = await fetch(url)
  if (!res.ok) return defaultBranding
  return res.json()
}

export function useBranding() {
  const { data, error, isLoading } = useSWR<Branding>('/api/branding', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 600000, // 10 minutes
    fallbackData: defaultBranding
  })

  return {
    branding: data ?? defaultBranding,
    isLoading,
    error
  }
}
