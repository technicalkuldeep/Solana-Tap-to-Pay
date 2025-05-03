"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Download } from "lucide-react"
import { useTheme } from "next-themes"

interface QRCodeGeneratorProps {
  paymentLink: string
  showControls?: boolean
  size?: number
}

export default function QRCodeGenerator({ paymentLink, showControls = true, size = 200 }: QRCodeGeneratorProps) {
  const [copied, setCopied] = useState(false)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { resolvedTheme } = useTheme()

  // Generate QR code as an SVG string
  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true)

        // Use a simple API to generate QR code
        // Add dark mode support by changing colors
        const isDarkMode = resolvedTheme === "dark"
        const darkColor = isDarkMode ? "FFFFFF" : "000000" // White in dark mode, black in light mode
        const lightColor = isDarkMode ? "000000" : "FFFFFF" // Black in dark mode, white in light mode

        const response = await fetch(
          `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
            paymentLink,
          )}&size=${size}x${size}&format=svg&color=${darkColor}&bgcolor=${lightColor}`,
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
  }, [paymentLink, resolvedTheme, size])

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
    const isDarkMode = resolvedTheme === "dark"
    const darkColor = isDarkMode ? "FFFFFF" : "000000" // White in dark mode, black in light mode
    const lightColor = isDarkMode ? "000000" : "FFFFFF" // Black in dark mode, white in light mode

    const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
      paymentLink,
    )}&size=${size}x${size}&format=png&color=${darkColor}&bgcolor=${lightColor}&download=1`

    // Open in a new tab which will trigger download
    window.open(downloadUrl, "_blank")
  }

  return (
    <div className="space-y-4">
      {showControls && (
        <div className="p-3 bg-white border border-gray-300 rounded-md text-sm break-all relative dark:bg-gray-700 dark:border-gray-600">
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
      )}

      <div className={`flex justify-center ${showControls ? "py-4" : "py-0"}`}>
        <div
          className={`${showControls ? "bg-white p-4 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600" : ""}`}
        >
          {isLoading ? (
            <div className={`flex justify-center items-center h-[${size}px] w-[${size}px]`}>
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : qrImage ? (
            <div
              className={`h-[${size}px] w-[${size}px] flex items-center justify-center`}
              dangerouslySetInnerHTML={{ __html: qrImage }}
            />
          ) : (
            <div className={`flex justify-center items-center h-[${size}px] w-[${size}px] text-red-500`}>
              Failed to generate QR code
            </div>
          )}
          {showControls && (
            <div className="flex justify-between items-center mt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Scan to pay</div>
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
          )}
        </div>
      </div>
    </div>
  )
}
