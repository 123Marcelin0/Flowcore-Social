import { AppShell } from "@/components/app-shell"

export default function RoutedLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
			<AppShell>
				<div id="main">{children}</div>
			</AppShell>
		</>
	)
}