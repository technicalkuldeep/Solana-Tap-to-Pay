"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Download } from "lucide-react"

interface QRCodeGeneratorProps {
  paymentLink: string
}

export default function QRCodeGenerator({ paymentLink }: QRCodeGeneratorProps) {
  const [copied, setCopied] = useState(false)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Generate QR code as an SVG string
  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true)

        // Use a simple API to generate QR code
        const response = await fetch(
          `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paymentLink)}&size=200x200&format=svg`,
        )

        if (!response.ok) throw new Error("Failed to generate QR code")

        const svgText = await response.text()
        setQrImage(svgText)
      } catch (error) {
        console.error("Error generating QR code:", error)
      } finally {
        setIsLoading(false)
      }
    }

    generateQR()
  }, [paymentLink])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  // Download as PNG using a different approach
  const downloadQR = () => {
    // Create a link to download the QR code from the API directly
    const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
      paymentLink,
    )}&size=200x200&format=png&download=1`

    // Open in a new tab which will trigger download
    window.open(downloadUrl, "_blank")
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-white border border-gray-300 rounded-md text-sm break-all relative">
        {paymentLink}
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={copyToClipboard}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex justify-center py-4">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          {isLoading ? (
            <div className="flex justify-center items-center h-[200px] w-[200px]">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : qrImage ? (
            <div
              className="h-[200px] w-[200px] flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qrImage }}
            />
          ) : (
            <div className="flex justify-center items-center h-[200px] w-[200px] text-red-500">
              Failed to generate QR code
            </div>
          )}
          <div className="flex justify-between items-center mt-3">
            <div className="text-xs text-gray-500">Scan to pay</div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQR}
              className="text-xs flex items-center gap-1"
              disabled={isLoading || !qrImage}
            >
              <Download className="h-3 w-3" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
