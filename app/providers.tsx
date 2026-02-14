"use client"

import type { ReactNode } from "react"
import { OnchainKitProvider } from "@coinbase/onchainkit"
import { base } from "wagmi/chains"

// Platform wallet — OpenRx treasury on Base
// This is where platform fees, agent payments, and funds are managed
export const PLATFORM_WALLET = "0x1C4C5a5B28d7172f8BDd8B3b7D9d0e2e1f8A6b3C" as const
export const DEVELOPER_WALLET = process.env.NEXT_PUBLIC_DEVELOPER_WALLET || PLATFORM_WALLET

export function Providers({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      chain={base}
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      config={{
        appearance: {
          mode: "dark",
          theme: "custom",
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  )
}
