'use client'

/**
 * Global Error Boundary
 * Displays errors that occur during hydration or component rendering
 * instead of silently freezing the page.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-12">
      <main className="w-full max-w-lg flex flex-col items-center justify-center gap-8 text-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-red-400">Something went wrong</h1>
          <p className="text-lg text-gray-300">An unexpected error occurred</p>
        </div>

        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 max-w-sm w-full">
          <p className="text-sm text-red-300 font-mono text-left break-words">
            {error.message || 'Unknown error'}
          </p>
          {process.env.NODE_ENV === 'development' && error.digest && (
            <p className="text-xs text-gray-400 mt-2">Digest: {error.digest}</p>
          )}
        </div>

        <button
          onClick={() => reset()}
          className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
        >
          Try again
        </button>

        <p className="text-sm text-gray-500">
          If this error persists, please refresh the page or try again later.
        </p>
      </main>
    </div>
  )
}
