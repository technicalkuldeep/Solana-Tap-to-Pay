"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { WalletButton } from "@/components/wallet-button"
import { PaymentForm } from "@/components/payment-form"
import { TransactionHistory } from "@/components/transaction-history"
import { SOLANA_NETWORK } from "@/lib/solana-config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SolanaPaymentRequest() {
  const { publicKey } = useWallet()
  const [recentPaymentLinks, setRecentPaymentLinks] = useState<string[]>([])
  const [recipientAddress, setRecipientAddress] = useState<string>("")

  const handlePaymentGenerated = (link: string) => {
    setRecentPaymentLinks((prev) => [link, ...prev.slice(0, 4)])

    // Extract recipient address from the payment link
    try {
      const url = new URL(link)
      const recipient = url.pathname.replace("solana:", "")
      setRecipientAddress(recipient)
    } catch (error) {
      console.error("Failed to extract recipient address from link:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-800 to-blue-900 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">Solana Tap-to-Pay</CardTitle>
          <CardDescription className="text-gray-200 text-center">
            Create payment requests on {SOLANA_NETWORK} in seconds
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-center py-4">
            <WalletButton />
          </div>

          {!publicKey ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <p className="text-gray-600">
                Connect your wallet to create payment requests or view your transaction history.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Request</TabsTrigger>
                <TabsTrigger value="history">Transaction History</TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="mt-4">
                <PaymentForm onPaymentGenerated={handlePaymentGenerated} />
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <TransactionHistory recipientAddress={recipientAddress} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>

        <CardFooter className="bg-gray-100 px-6 py-4 text-center text-sm text-gray-600 rounded-b-lg flex flex-col gap-2">
          <p>Secure, fast, and decentralized payments on Solana {SOLANA_NETWORK}</p>
          <p className="text-xs text-gray-500">Note: This app runs on Solana Devnet (testnet)</p>
        </CardFooter>
      </Card>
    </div>
  )
}
