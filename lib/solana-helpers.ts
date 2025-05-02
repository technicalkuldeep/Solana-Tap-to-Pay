import { Connection, type ConnectionConfig } from "@solana/web3.js"
import { SOLANA_ENDPOINT } from "./solana-config"

// Cache for storing recent results to avoid duplicate requests
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds cache lifetime

// Create a rate-limited connection with exponential backoff
export function createRateLimitedConnection(): Connection {
  const config: ConnectionConfig = {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  }

  const connection = new Connection(SOLANA_ENDPOINT, config)

  // Wrap methods that might hit rate limits
  const originalGetSignaturesForAddress = connection.getSignaturesForAddress.bind(connection)
  connection.getSignaturesForAddress = async (address, options) => {
    const cacheKey = `signatures:${address.toBase58()}:${JSON.stringify(options)}`
    const cached = requestCache.get(cacheKey)

    // Return cached result if it's fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    // Otherwise make the request with retry logic
    let retries = 0
    const maxRetries = 5

    while (retries < maxRetries) {
      try {
        // Add increasing delay between retries
        if (retries > 0) {
          const delay = Math.min(1000 * Math.pow(2, retries), 10000) // Exponential backoff, max 10s
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        const result = await originalGetSignaturesForAddress(address, options)

        // Cache the successful result
        requestCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      } catch (error) {
        if (error instanceof Error && error.message.includes("429")) {
          console.log(`Rate limited (429). Retry ${retries + 1}/${maxRetries}...`)
          retries++
          if (retries >= maxRetries) throw error
        } else {
          throw error
        }
      }
    }

    throw new Error("Maximum retries exceeded")
  }

  // Also wrap getParsedTransaction with similar logic
  const originalGetParsedTransaction = connection.getParsedTransaction.bind(connection)
  connection.getParsedTransaction = async (signature, options) => {
    const cacheKey = `tx:${signature}:${JSON.stringify(options)}`
    const cached = requestCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    let retries = 0
    const maxRetries = 5

    while (retries < maxRetries) {
      try {
        if (retries > 0) {
          const delay = Math.min(1000 * Math.pow(2, retries), 10000)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        const result = await originalGetParsedTransaction(signature, options)

        requestCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      } catch (error) {
        if (error instanceof Error && error.message.includes("429")) {
          console.log(`Rate limited (429). Retry ${retries + 1}/${maxRetries}...`)
          retries++
          if (retries >= maxRetries) throw error
        } else {
          throw error
        }
      }
    }

    throw new Error("Maximum retries exceeded")
  }

  // Wrap getBalance with similar logic
  const originalGetBalance = connection.getBalance.bind(connection)
  connection.getBalance = async (publicKey, commitment) => {
    const cacheKey = `balance:${publicKey.toBase58()}:${commitment || "default"}`
    const cached = requestCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    let retries = 0
    const maxRetries = 5

    while (retries < maxRetries) {
      try {
        if (retries > 0) {
          const delay = Math.min(1000 * Math.pow(2, retries), 10000)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        const result = await originalGetBalance(publicKey, commitment)

        requestCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      } catch (error) {
        if (error instanceof Error && error.message.includes("429")) {
          console.log(`Rate limited (429). Retry ${retries + 1}/${maxRetries}...`)
          retries++
          if (retries >= maxRetries) throw error
        } else {
          throw error
        }
      }
    }

    throw new Error("Maximum retries exceeded")
  }

  return connection
}
