import { SimpleDatabaseSetup } from '@/components/simple-database-setup'

export default function TestDatabasePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">Database Test Page</h1>
        <SimpleDatabaseSetup />
      </div>
    </div>
  )
}