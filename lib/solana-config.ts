import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js"

// Use Solana devnet (testnet)
export const SOLANA_NETWORK = "devnet"
export const SOLANA_ENDPOINT = clusterApiUrl(SOLANA_NETWORK)
export const connection = new Connection(SOLANA_ENDPOINT, "confirmed")

// Validate Solana address
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address)
    return true
  } catch (error) {
    return false
  }
}

// Format SOL amount with proper decimals
export const formatSol = (amount: number): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 9,
  })
}

// Parse SOL amount from string to lamports
export const solToLamports = (sol: string): number => {
  return Math.round(Number.parseFloat(sol) * 1_000_000_000)
}

// Format timestamp to readable date
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}
