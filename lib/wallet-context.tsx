"use client"

// ── Wallet Identity Context ────────────────────────────────
// React context that bridges Coinbase Smart Wallet connection
// with the OpenRx identity system. Automatically loads/saves
// user profiles when wallet connects/disconnects.

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { useAccount } from "wagmi"
import {
  type WalletProfile,
  loadWalletProfile,
  saveWalletProfile,
  createBlankProfile,
  profileToPatient,
} from "./wallet-identity"
import type { LivePatient } from "./live-data-types"

const EMPTY_PATIENT: LivePatient = {
  id: "",
  full_name: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  insurance_provider: "",
  insurance_plan: "",
  insurance_id: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  medical_history: [],
  allergies: [],
  primary_physician_id: "",
  created_at: "",
}

interface WalletIdentityState {
  // Wallet state
  isConnected: boolean
  walletAddress: string | undefined
  // Profile state
  profile: WalletProfile | null
  isNewUser: boolean
  isLoading: boolean
  // Patient-compatible data for existing components
  currentPatient: LivePatient
  // Actions
  updateProfile: (updates: Partial<WalletProfile>) => void
  completeOnboarding: () => void
  setAgentAutoPay: (enabled: boolean, limit?: number) => void
  setAgentRxAutoPay: (enabled: boolean) => void
}

const WalletIdentityContext = createContext<WalletIdentityState>({
  isConnected: false,
  walletAddress: undefined,
  profile: null,
  isNewUser: false,
  isLoading: true,
  currentPatient: EMPTY_PATIENT,
  updateProfile: () => {},
  completeOnboarding: () => {},
  setAgentAutoPay: () => {},
  setAgentRxAutoPay: () => {},
})

export function WalletIdentityProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const [profile, setProfile] = useState<WalletProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)

  // Load profile when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      const existing = loadWalletProfile(address)
      if (existing) {
        setProfile(existing)
        setIsNewUser(false)
      } else {
        const blank = createBlankProfile(address)
        saveWalletProfile(blank)
        setProfile(blank)
        setIsNewUser(true)
      }
    } else {
      setProfile(null)
      setIsNewUser(false)
    }
    setIsLoading(false)
  }, [isConnected, address])

  // Update profile
  const updateProfile = useCallback(
    (updates: Partial<WalletProfile>) => {
      if (!profile) return
      const updated = { ...profile, ...updates }
      setProfile(updated)
      saveWalletProfile(updated)
    },
    [profile]
  )

  // Complete onboarding
  const completeOnboarding = useCallback(() => {
    if (!profile) return
    const updated = { ...profile, onboardingComplete: true }
    setProfile(updated)
    saveWalletProfile(updated)
    setIsNewUser(false)
  }, [profile])

  // Agent auto-pay toggle
  const setAgentAutoPay = useCallback(
    (enabled: boolean, limit?: number) => {
      updateProfile({
        agentAutoPay: enabled,
        ...(limit !== undefined ? { agentAutoPayLimit: limit } : {}),
      })
    },
    [updateProfile]
  )

  // Agent Rx auto-pay toggle
  const setAgentRxAutoPay = useCallback(
    (enabled: boolean) => {
      updateProfile({ agentRxAutoPay: enabled })
    },
    [updateProfile]
  )

  const currentPatient: LivePatient =
    profile && profile.onboardingComplete
      ? profileToPatient(profile)
      : EMPTY_PATIENT

  return (
    <WalletIdentityContext.Provider
      value={{
        isConnected,
        walletAddress: address,
        profile,
        isNewUser,
        isLoading,
        currentPatient,
        updateProfile,
        completeOnboarding,
        setAgentAutoPay,
        setAgentRxAutoPay,
      }}
    >
      {children}
    </WalletIdentityContext.Provider>
  )
}

export function useWalletIdentity() {
  return useContext(WalletIdentityContext)
}
