'use client'

/**
 * Global Error Boundary
 * Catches errors thrown by the root layout itself
 * (regular error.tsx only catches page-level errors)
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-400 mb-4">App Error</h1>
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-300 font-mono break-words">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-gray-400 mt-2">Digest: {error.digest}</p>
            )}
          </div>
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-white text-black font-semibold rounded hover:bg-gray-100 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
