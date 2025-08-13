"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, User, Lock, Mail, AlertCircle, Sparkles, TrendingUp, Shield } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password, fullName)
      } else {
        await signIn(email, password)
      }
      
      // Redirect to dashboard after successful authentication
      router.push('/dashboard')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setFullName('')
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-teal-500/20 via-transparent to-cyan-500/20"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          
          {/* Company Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-2xl shadow-2xl mb-6 group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="mb-2">
              <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] text-3xl tracking-tight" style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}>
                flowcore
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 font-medium text-2xl tracking-tight ml-1" style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}>
                social
              </span>
            </h1>
            <p className="text-gray-400 text-sm font-medium tracking-wide">
              Professionelle Social Media Verwaltung
            </p>
          </div>

          {/* Login Card */}
          <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-3xl overflow-hidden">
            {/* Glassmorphism header with gradient border */}
            <div className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 p-1 rounded-t-3xl">
              <div className="bg-black/20 backdrop-blur-sm rounded-t-[22px] p-6">
                <CardHeader className="space-y-2 p-0">
                  <CardTitle className="text-2xl font-bold text-center text-white">
                    {isSignUp ? 'Konto erstellen' : 'Willkommen zurück'}
                  </CardTitle>
                  <CardDescription className="text-center text-gray-300 text-sm leading-relaxed">
                    {isSignUp 
                      ? 'Erstellen Sie Ihr Konto für den Zugang zu professionellen Social Media Tools'
                      : 'Melden Sie sich an, um auf Ihr Social Media Dashboard zuzugreifen'
                    }
                  </CardDescription>
                </CardHeader>
              </div>
            </div>

            <CardContent className="p-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-white font-medium">
                      Vollständiger Name
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-teal-400 transition-colors" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Ihren vollständigen Namen eingeben"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-12 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-300"
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white font-medium">
                    E-Mail-Adresse *
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-teal-400 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ihre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white font-medium">
                    Passwort *
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-teal-400 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sicheres Passwort eingeben"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-teal-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>{isSignUp ? 'Konto wird erstellt...' : 'Anmeldung läuft...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      {isSignUp ? <Sparkles className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      <span>{isSignUp ? 'Konto erstellen' : 'Anmelden'}</span>
                    </div>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-sm text-gray-300 hover:text-white transition-colors duration-200 relative group"
                  >
                    {isSignUp 
                      ? 'Bereits ein Konto? Hier anmelden'
                      : 'Noch kein Konto? Jetzt registrieren'
                    }
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="text-center mt-8">
            <div className="flex items-center justify-center space-x-6 text-gray-400 text-xs">
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>SSL-verschlüsselt</span>
              </div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="flex items-center space-x-1">
                <Lock className="w-4 h-4" />
                <span>DSGVO-konform</span>
              </div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>Professional</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
