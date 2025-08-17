"use client"

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
	return (
		<html>
			<body>
				<div className="min-h-screen flex items-center justify-center">
					<div className="text-center">
						<h1 className="text-3xl font-semibold mb-2">Something went wrong</h1>
						<p className="text-slate-600">{error.message}</p>
					</div>
				</div>
			</body>
		</html>
	)
}