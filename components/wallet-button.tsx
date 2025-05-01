"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useMemo } from "react"

export function WalletButton() {
  const { wallet, publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()

  const walletAddress = useMemo(() => {
    if (!publicKey) return null
    const address = publicKey.toBase58()
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }, [publicKey])

  const handleClick = () => {
    if (publicKey) {
      disconnect()
    } else {
      setVisible(true)
    }
  }

  return (
    <Button
      onClick={handleClick}
      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
      size="lg"
    >
      <Wallet className="h-5 w-5" />
      {publicKey ? `Disconnect ${walletAddress}` : "Connect Wallet"}
    </Button>
  )
}
