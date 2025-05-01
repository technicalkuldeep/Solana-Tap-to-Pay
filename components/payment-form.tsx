"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isValidSolanaAddress } from "@/lib/solana-config"
import { AlertCircle, HelpCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import QRCodeGenerator from "./qr-code-generator"
import { Keypair } from "@solana/web3.js"

interface PaymentFormProps {
  onPaymentGenerated: (link: string) => void
}

export function PaymentForm({ onPaymentGenerated }: PaymentFormProps) {
  const { publicKey } = useWallet()
  const [amount, setAmount] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [paymentLabel, setPaymentLabel] = useState("")
  const [paymentLink, setPaymentLink] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Auto-populate recipient address with connected wallet address when wallet is connected
  useEffect(() => {
    if (publicKey && !recipientAddress) {
      setRecipientAddress(publicKey.toBase58())
    }
  }, [publicKey, recipientAddress])

  const validateForm = () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      setError("Please enter a valid amount")
      return false
    }

    if (!recipientAddress) {
      setError("Please enter a recipient address")
      return false
    }

    if (!isValidSolanaAddress(recipientAddress)) {
      setError("Please enter a valid Solana address")
      return false
    }

    setError(null)
    return true
  }

  const generatePaymentLink = () => {
    if (!validateForm()) return

    try {
      // Generate a random keypair to use as reference
      const referenceKeypair = Keypair.generate()
      const referencePublicKey = referenceKeypair.publicKey.toBase58()

      // Create the Solana Pay URL using the format from the working example
      const baseUrl = `solana:${recipientAddress}`
      const params = new URLSearchParams({
        amount,
        reference: referencePublicKey,
        ...(paymentLabel && { label: paymentLabel }),
        message: paymentLabel || "Solana Payment",
      })

      const link = `${baseUrl}?${params.toString()}`
      setPaymentLink(link)
      onPaymentGenerated(link)
    } catch (error) {
      console.error("Error generating payment link:", error)
      setError("Failed to generate payment link")
    }
  }

  if (!publicKey) {
    return null
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
        <h3 className="font-medium text-blue-800 mb-2">How This Works:</h3>
        <p className="text-sm text-blue-700">
          1. Your connected wallet ({publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}) will be used
          to <strong>create</strong> the payment request.
        </p>
        <p className="text-sm text-blue-700 mt-1">
          2. The recipient address is pre-filled with your wallet address, but you can change it to any other address.
        </p>
        <p className="text-sm text-blue-700 mt-1">
          3. When someone scans the QR code, their wallet will prompt them to send the specified amount to the
          recipient.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount in SOL</Label>
        <Input
          id="amount"
          type="number"
          placeholder="0.05"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Pre-filled with your wallet address. Change it to send to a different address.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="recipient"
          placeholder="Enter Solana wallet address where funds will be sent"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Payment Label (optional)</Label>
        <Input
          id="label"
          placeholder="Coffee payment"
          value={paymentLabel}
          onChange={(e) => setPaymentLabel(e.target.value)}
          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <Button onClick={generatePaymentLink} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        Generate Payment Link
      </Button>

      {paymentLink && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This QR code is for others to scan and pay you. When someone scans this with their
              Phantom app, they will be prompted to send {amount} SOL to {recipientAddress.slice(0, 4)}...
              {recipientAddress.slice(-4)}.
            </p>
          </div>
          <QRCodeGenerator paymentLink={paymentLink} />
        </div>
      )}
    </div>
  )
}
