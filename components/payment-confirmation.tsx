"use client"

import { useEffect, useState } from "react"
import { PublicKey } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createRateLimitedConnection } from "@/lib/solana-helpers"
import QRCodeGenerator from "./qr-code-generator"

interface PaymentConfirmationProps {
  recipientAddress: string
  amount: string
  reference?: string
  paymentLink: string
  onClose: () => void
}

export function PaymentConfirmation({
  recipientAddress,
  amount,
  reference,
  paymentLink,
  onClose,
}: PaymentConfirmationProps) {
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [payerAddress, setPayerAddress] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [checkCount, setCheckCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const checkForPayment = async () => {
      if (!isMounted || isConfirmed) return

      try {
        const connection = createRateLimitedConnection()
        const recipientPubkey = new PublicKey(recipientAddress)

        // Get recent signatures for the recipient
        const signatures = await connection.getSignaturesForAddress(recipientPubkey, { limit: 5 })

        // Check each transaction
        for (const sig of signatures) {
          try {
            const tx = await connection.getParsedTransaction(sig.signature)
            if (!tx || !tx.meta) continue

            // Find SOL transfers to the recipient
            const instructions = tx.transaction.message.instructions
            for (const ix of instructions) {
              if ("parsed" in ix && ix.parsed.type === "transfer") {
                const { info } = ix.parsed
                const sender = info.source
                const receiver = info.destination
                const txAmount = info.lamports / 1_000_000_000 // Convert lamports to SOL

                // Check if this is a payment to our recipient with the expected amount
                if (
                  receiver === recipientAddress &&
                  Math.abs(txAmount - Number.parseFloat(amount)) < 0.0001 && // Allow small rounding differences
                  sig.blockTime &&
                  Date.now() - sig.blockTime * 1000 < 5 * 60 * 1000 // Within last 5 minutes
                ) {
                  if (isMounted) {
                    setIsConfirmed(true)
                    setPayerAddress(sender)
                  }
                  return
                }
              }
            }
          } catch (error) {
            console.error("Error processing transaction:", error)
          }
        }

        // If we've checked 15 times (about 2.5 minutes with increased interval) without finding the payment, stop checking
        if (isMounted) {
          if (checkCount >= 15) {
            setIsChecking(false)
          } else {
            setCheckCount((prev) => prev + 1)
            // Check again in 10 seconds (increased from 5 seconds)
            timeoutId = setTimeout(checkForPayment, 10000)
          }
        }
      } catch (error) {
        console.error("Error checking for payment:", error)
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    // Start checking after a short delay to avoid immediate rate limiting
    timeoutId = setTimeout(checkForPayment, 2000)

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [recipientAddress, amount, reference, isConfirmed, checkCount])

  const handleClose = () => {
    onClose()
  }

  const handleNewPayment = () => {
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className={isConfirmed ? "bg-green-100 dark:bg-green-900" : "bg-blue-100 dark:bg-blue-900"}>
          <CardTitle className="flex items-center gap-2">
            {isConfirmed ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                Payment Confirmed!
              </>
            ) : (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                Waiting for Payment...
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isConfirmed
              ? "The payment has been successfully received."
              : "Scan the QR code below to complete the payment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isConfirmed ? (
            <div className="space-y-4">
              <div className="p-6 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{amount} SOL</p>
                <p className="text-green-600 dark:text-green-400">paid successfully</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">From:</span>
                  <span className="text-sm font-medium dark:text-gray-300">
                    {payerAddress ? `${payerAddress.slice(0, 6)}...${payerAddress.slice(-6)}` : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">To:</span>
                  <span className="text-sm font-medium dark:text-gray-300">
                    {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-6)}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Thank you for using Solana Tap-to-Pay!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-xl font-bold dark:text-gray-200 mb-2">{amount} SOL</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  to {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-6)}
                </p>

                {/* QR Code displayed in the modal */}
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg inline-block">
                  <QRCodeGenerator paymentLink={paymentLink} />
                </div>
              </div>

              {!isChecking && (
                <div className="text-center text-amber-600 dark:text-amber-400">
                  <p>We haven't detected your payment yet.</p>
                  <p className="text-sm">If you've already paid, it may take a moment to confirm on the blockchain.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2 justify-end">
          {isConfirmed ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleNewPayment}>New Payment</Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
