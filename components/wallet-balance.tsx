"use client"

import { useState, useEffect } from "react"
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createRateLimitedConnection } from "@/lib/solana-helpers"

interface WalletBalanceProps {
  walletAddress: string
  label: string
}

export function WalletBalance({ walletAddress, label }: WalletBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = async () => {
    if (!walletAddress) return

    setLoading(true)
    setError(null)

    try {
      const connection = createRateLimitedConnection()
      const publicKey = new PublicKey(walletAddress)
      const balanceInLamports = await connection.getBalance(publicKey)
      const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL
      setBalance(balanceInSol)
    } catch (err) {
      console.error("Error fetching balance:", err)
      setError("Failed to fetch balance")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [walletAddress])

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium dark:text-gray-300">{label}:</span>
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
      ) : error ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-sm text-red-500 dark:text-red-400">Error</TooltipTrigger>
            <TooltipContent>
              <p>{error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className="text-sm font-bold dark:text-gray-200">
          {balance !== null ? `${balance.toFixed(4)} SOL` : "Unknown"}
        </span>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={fetchBalance}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh balance</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
