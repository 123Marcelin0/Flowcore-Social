"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset?: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-slate-600 mb-4">{error?.message || "Unknown error"}</p>
        {reset && (
          <button onClick={() => reset()} className="text-blue-600 hover:underline">
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
