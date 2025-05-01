"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Connection, PublicKey } from "@solana/web3.js"
import { SOLANA_ENDPOINT, formatDate } from "@/lib/solana-config"
import { ArrowDownRight, ArrowUpRight, ExternalLink, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WalletBalance } from "./wallet-balance"
import { Card, CardContent } from "@/components/ui/card"

interface Transaction {
  signature: string
  timestamp: number
  amount: number
  sender: string
  receiver: string
  isIncoming: boolean
}

interface TransactionHistoryProps {
  recipientAddress?: string
}

export function TransactionHistory({ recipientAddress }: TransactionHistoryProps) {
  const { publicKey } = useWallet()
  const [connectedWalletTxs, setConnectedWalletTxs] = useState<Transaction[]>([])
  const [recipientWalletTxs, setRecipientWalletTxs] = useState<Transaction[]>([])
  const [loadingConnected, setLoadingConnected] = useState(false)
  const [loadingRecipient, setLoadingRecipient] = useState(false)
  const [activeTab, setActiveTab] = useState("connected")
  const [error, setError] = useState<string | null>(null)
  const [showBalances, setShowBalances] = useState(false)

  // Create a throttled connection to avoid rate limits
  const getThrottledConnection = () => {
    const connection = new Connection(SOLANA_ENDPOINT, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    })

    // Wrap the getParsedTransaction method to add delay between requests
    const originalGetParsedTransaction = connection.getParsedTransaction.bind(connection)
    connection.getParsedTransaction = async (signature, ...args) => {
      try {
        // Add a small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300))
        return await originalGetParsedTransaction(signature, ...args)
      } catch (error) {
        if (error instanceof Error && error.message.includes("429")) {
          // If we hit a rate limit, wait longer and retry
          await new Promise((resolve) => setTimeout(resolve, 2000))
          return await originalGetParsedTransaction(signature, ...args)
        }
        throw error
      }
    }

    return connection
  }

  // Fetch transactions for connected wallet
  useEffect(() => {
    const fetchConnectedWalletTransactions = async () => {
      if (!publicKey) return

      setLoadingConnected(true)
      setError(null)

      try {
        const connection = getThrottledConnection()

        // Limit to fewer signatures to reduce API calls
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 })

        const parsedTransactions: Transaction[] = []

        for (const sig of signatures) {
          try {
            const tx = await connection.getParsedTransaction(sig.signature)
            if (!tx || !tx.meta) continue

            // Find SOL transfers
            const instructions = tx.transaction.message.instructions
            for (const ix of instructions) {
              if ("parsed" in ix && ix.parsed.type === "transfer") {
                const { info } = ix.parsed
                const sender = info.source
                const receiver = info.destination
                const amount = info.lamports / 1_000_000_000 // Convert lamports to SOL

                parsedTransactions.push({
                  signature: sig.signature,
                  timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
                  amount,
                  sender,
                  receiver,
                  isIncoming: receiver === publicKey.toBase58(),
                })
              }
            }
          } catch (error) {
            console.error("Error processing transaction:", error)
            // Continue with other transactions
          }
        }

        setConnectedWalletTxs(parsedTransactions)
      } catch (error) {
        console.error("Error fetching connected wallet transactions:", error)
        setError("Failed to load transactions. The Solana network may be experiencing high traffic.")
      } finally {
        setLoadingConnected(false)
      }
    }

    fetchConnectedWalletTransactions()
  }, [publicKey])

  // Fetch transactions for recipient wallet only when tab is active
  useEffect(() => {
    const fetchRecipientWalletTransactions = async () => {
      if (!recipientAddress || activeTab !== "recipient") return

      setLoadingRecipient(true)
      setError(null)

      try {
        const connection = getThrottledConnection()

        try {
          const recipientPublicKey = new PublicKey(recipientAddress)

          // Limit to fewer signatures to reduce API calls
          const signatures = await connection.getSignaturesForAddress(recipientPublicKey, { limit: 5 })

          const parsedTransactions: Transaction[] = []

          for (const sig of signatures) {
            try {
              const tx = await connection.getParsedTransaction(sig.signature)
              if (!tx || !tx.meta) continue

              // Find SOL transfers
              const instructions = tx.transaction.message.instructions
              for (const ix of instructions) {
                if ("parsed" in ix && ix.parsed.type === "transfer") {
                  const { info } = ix.parsed
                  const sender = info.source
                  const receiver = info.destination
                  const amount = info.lamports / 1_000_000_000 // Convert lamports to SOL

                  parsedTransactions.push({
                    signature: sig.signature,
                    timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
                    amount,
                    sender,
                    receiver,
                    isIncoming: receiver === recipientAddress,
                  })
                }
              }
            } catch (error) {
              console.error("Error processing transaction:", error)
              // Continue with other transactions
            }
          }

          setRecipientWalletTxs(parsedTransactions)
        } catch (error) {
          console.error("Invalid recipient address:", error)
          setError("Invalid recipient address")
        }
      } catch (error) {
        console.error("Error fetching recipient wallet transactions:", error)
        setError("Failed to load transactions. The Solana network may be experiencing high traffic.")
      } finally {
        setLoadingRecipient(false)
      }
    }

    fetchRecipientWalletTransactions()
  }, [recipientAddress, activeTab])

  if (!publicKey) {
    return null
  }

  const openExplorer = (signature: string) => {
    window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, "_blank")
  }

  const toggleBalances = () => {
    setShowBalances(!showBalances)
  }

  const renderTransactions = (transactions: Transaction[], loading: boolean, walletAddress: string) => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (transactions.length === 0) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No transactions found on devnet</p>
          <p className="text-xs text-gray-400 mt-2">Try sending some SOL on the devnet first</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div key={tx.signature} className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className={`p-2 rounded-full mr-3 ${tx.isIncoming ? "bg-green-100" : "bg-blue-100"}`}>
              {tx.isIncoming ? (
                <ArrowDownRight className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium">{tx.isIncoming ? "Received" : "Sent"} SOL</span>
                <span className={`font-medium ${tx.isIncoming ? "text-green-600" : "text-blue-600"}`}>
                  {tx.isIncoming ? "+" : "-"}
                  {tx.amount.toFixed(4)} SOL
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{formatDate(tx.timestamp)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-gray-500"
                  onClick={() => openExplorer(tx.signature)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" /> Explorer
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Transaction History</h2>
        <Button variant="outline" size="sm" onClick={toggleBalances} className="text-xs">
          {showBalances ? "Hide Balances" : "Show Balances"}
        </Button>
      </div>

      {showBalances && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="space-y-2">
              <WalletBalance walletAddress={publicKey.toBase58()} label="Your Wallet Balance" />
              {recipientAddress && recipientAddress !== publicKey.toBase58() && (
                <WalletBalance walletAddress={recipientAddress} label="Recipient Wallet Balance" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {recipientAddress ? (
        <Tabs defaultValue="connected" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connected">Your Wallet</TabsTrigger>
            <TabsTrigger value="recipient">Recipient Wallet</TabsTrigger>
          </TabsList>
          <TabsContent value="connected" className="mt-4">
            <h3 className="text-sm font-medium mb-3">Transactions for your wallet</h3>
            {renderTransactions(connectedWalletTxs, loadingConnected, publicKey.toBase58())}
          </TabsContent>
          <TabsContent value="recipient" className="mt-4">
            <h3 className="text-sm font-medium mb-3">Transactions for recipient wallet</h3>
            {renderTransactions(recipientWalletTxs, loadingRecipient, recipientAddress)}
          </TabsContent>
        </Tabs>
      ) : (
        renderTransactions(connectedWalletTxs, loadingConnected, publicKey.toBase58())
      )}
    </div>
  )
}
