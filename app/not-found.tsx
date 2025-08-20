export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center p-8">
			<div className="text-center">
				<h1 className="text-3xl font-semibold mb-2">Page not found</h1>
				<p className="text-slate-600 mb-4">The page you are looking for does not exist.</p>
				<a href="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</a>
			</div>
		</div>
	)
}
