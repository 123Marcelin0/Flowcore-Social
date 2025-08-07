"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  Home,
  MessageSquare,
  Lightbulb,
  Settings,
  Bell,
  Star,
  ChevronDown,
  User,
  CreditCard,
  LogOut,
  Mail,
  Shield,
  Sparkles,
  Calendar
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

type Section = "dashboard" | "calendar" | "ai-studio" | "interactions" | "ideas" | "settings"

interface AppSidebarProps {
  activeSection: Section
  setActiveSection: (section: Section) => void
  onLogout?: () => void
}

export function AppSidebar({ activeSection, setActiveSection, onLogout }: AppSidebarProps) {
  const { user, userProfile } = useAuth()

  const menuItems = [
    { id: "dashboard" as Section, label: "Dashboard", icon: Home },
    { id: "calendar" as Section, label: "Kalender", icon: Calendar },
    { id: "ai-studio" as Section, label: "KI-Studio", icon: Sparkles },
    { id: "interactions" as Section, label: "KI-Assistent", icon: MessageSquare },
    { id: "ideas" as Section, label: "Content-Ideen", icon: Lightbulb },
    { id: "settings" as Section, label: "Einstellungen", icon: Settings },
  ]

  // Get user display info
  const userDisplayName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userEmail = user?.email || 'No email'
  const userInitials = userDisplayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const userAvatar = userProfile?.avatar_url || '/placeholder-user.jpg'
  const subscriptionTier = userProfile?.subscription_tier || 'free'

  // Format subscription tier for display
  const getSubscriptionLabel = (tier: string) => {
    switch (tier) {
      case 'pro':
        return 'Pro-Plan'
      case 'enterprise':
        return 'Enterprise'
      default:
        return 'Kostenlos'
    }
  }

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'pro':
        return 'bg-teal-50 text-teal-600 border-teal-100'
      case 'enterprise':
        return 'bg-purple-50 text-purple-600 border-purple-100'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100'
    }
  }

  // Check if AI Studio is active for glassmorphic design
  const isAIStudio = activeSection === "ai-studio"
  // Check if Content page is active for black text
  const isContentPage = activeSection === "ideas"

  return (
    <div className={`w-72 flex flex-col transition-all duration-500 ${
      isAIStudio 
        ? 'hidden' 
        : 'bg-white h-screen'
    }`}>

      {/* Header */}
      <div className={`p-8 transition-all duration-500 ${
        isAIStudio ? 'glass-panel shadow-[0_1px_20px_rgba(255,255,255,0.1)]' : ''
      }`}>
        <div className="flex items-center">
          <div className="flex items-baseline">
            <span className={`font-medium text-transparent bg-clip-text text-2xl tracking-tight transition-all duration-500 ${
              isAIStudio 
                ? 'bg-gradient-to-r from-white via-blue-100 to-purple-100' 
                : isContentPage
                  ? 'bg-gradient-to-r from-gray-800 via-black to-gray-900'
                  : 'bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316]'
            }`} style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}>
              flowcore
            </span>
            <span className={`text-transparent bg-clip-text font-medium text-lg tracking-tight ml-1 transition-all duration-500 ${
              isAIStudio 
                ? 'bg-gradient-to-r from-blue-200 via-cyan-200 to-teal-200' 
                : isContentPage
                  ? 'bg-gradient-to-r from-gray-800 via-black to-gray-900'
                  : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500'
            }`} style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}>
              social
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-8">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              variant="ghost"
              className={`w-full justify-start gap-3 px-4 py-3 text-sm rounded-2xl transition-all duration-300 ${
                activeSection === item.id
                  ? isAIStudio
                    ? "glass-panel-strong text-white border border-white/40 shadow-xl"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                  : isAIStudio
                    ? "text-white/80 hover:glass-button hover:text-white"
                    : "text-slate-700 hover:bg-gray-50 hover:text-slate-800"
              }`}
            >
              <item.icon className={`w-4 h-4 transition-all duration-300 ${
                activeSection === item.id 
                  ? isAIStudio 
                    ? "text-white" 
                    : "text-blue-600"
                  : isAIStudio
                    ? "text-white/70"
                    : "text-gray-500"
              }`} />
              <span className="font-medium tracking-tight">{item.label}</span>
            </Button>
          ))}
        </nav>
      </div>

      {/* User Profile */}
      <div className={`p-8 transition-all duration-500`}>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              className={`w-full justify-start gap-3 px-3 py-2 h-auto rounded-2xl transition-all duration-300 ${
                isAIStudio 
                  ? 'hover:glass-button' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <Avatar className={`w-9 h-9 border-2 shadow-lg transition-all duration-300 ${
                isAIStudio ? 'border-white/40' : 'border-gray-200'
              }`}>
                <AvatarImage src={userAvatar} alt={userDisplayName} />
                <AvatarFallback className={`font-medium transition-all duration-300 ${
                  isAIStudio 
                    ? 'bg-white/30 backdrop-blur-xl text-white text-sm' 
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm'
                }`}>
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold tracking-tight truncate transition-all duration-300 ${
                  isAIStudio ? 'text-white' : 'text-slate-800'
                }`}>{userDisplayName}</p>
                <p className={`text-xs truncate transition-all duration-300 ${
                  isAIStudio ? 'text-white/70' : 'text-slate-600'
                }`}>{userEmail}</p>
              </div>
              <ChevronDown className={`w-4 h-4 transition-all duration-300 ${
                isAIStudio ? 'text-white/70' : 'text-slate-600'
              }`} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={`w-64 p-0 rounded-2xl shadow-2xl transition-all duration-500 ${
            isAIStudio 
              ? 'glass-panel-strong border-white/20' 
              : 'bg-white border border-gray-200'
          }`} align="start">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className={`w-12 h-12 border-2 shadow-lg ${
                  isAIStudio ? 'border-white/40' : 'border-gray-200'
                }`}>
                  <AvatarImage src={userAvatar} alt={userDisplayName} />
                  <AvatarFallback className={`font-medium ${
                    isAIStudio 
                      ? 'bg-white/30 backdrop-blur-xl text-white' 
                      : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                  }`}>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className={`font-semibold truncate ${
                    isAIStudio ? 'text-white' : 'text-gray-900'
                  }`}>{userDisplayName}</p>
                  <p className={`text-sm truncate ${
                    isAIStudio ? 'text-white/70' : 'text-gray-500'
                  }`}>{userEmail}</p>
                  <Badge variant="secondary" className={`mt-1 text-xs transition-all duration-300 ${
                    isAIStudio 
                      ? 'bg-white/20 text-white border-white/30' 
                      : getSubscriptionColor(subscriptionTier)
                  }`}>
                    {getSubscriptionLabel(subscriptionTier)}
                  </Badge>
                </div>
              </div>
              
              <Separator className={`my-3 ${
                isAIStudio ? 'bg-white/20' : ''
              }`} />
              
              <div className="space-y-1">
                <Button variant="ghost" className={`w-full justify-start gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                  isAIStudio 
                    ? 'hover:bg-white/15 text-white/90 backdrop-blur-lg' 
                    : isContentPage
                      ? 'hover:bg-gray-50 text-black'
                      : 'hover:bg-gray-50'
                }`}>
                  <User className={`w-4 h-4 ${
                    isAIStudio ? 'text-white/70' : isContentPage ? 'text-black/70' : 'text-gray-500'
                  }`} />
                  Konto-Einstellungen
                </Button>
                <Button variant="ghost" className={`w-full justify-start gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                  isAIStudio 
                    ? 'hover:bg-white/15 text-white/90 backdrop-blur-lg' 
                    : isContentPage
                      ? 'hover:bg-gray-50 text-black'
                      : 'hover:bg-gray-50'
                }`}>
                  <CreditCard className={`w-4 h-4 ${
                    isAIStudio ? 'text-white/70' : isContentPage ? 'text-black/70' : 'text-gray-500'
                  }`} />
                  Abrechnung & Pläne
                </Button>
                <Button variant="ghost" className={`w-full justify-start gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                  isAIStudio 
                    ? 'hover:bg-white/15 text-white/90 backdrop-blur-lg' 
                    : isContentPage
                      ? 'hover:bg-gray-50 text-black'
                      : 'hover:bg-gray-50'
                }`}>
                  <Shield className={`w-4 h-4 ${
                    isAIStudio ? 'text-white/70' : isContentPage ? 'text-black/70' : 'text-gray-500'
                  }`} />
                  Datenschutz & Sicherheit
                </Button>
                <Button variant="ghost" className={`w-full justify-start gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                  isAIStudio 
                    ? 'hover:bg-white/15 text-white/90 backdrop-blur-lg' 
                    : isContentPage
                      ? 'hover:bg-gray-50 text-black'
                      : 'hover:bg-gray-50'
                }`}>
                  <Mail className={`w-4 h-4 ${
                    isAIStudio ? 'text-white/70' : isContentPage ? 'text-black/70' : 'text-gray-500'
                  }`} />
                  E-Mail-Einstellungen
                </Button>
              </div>
              
              <Separator className={`my-3 ${
                isAIStudio ? 'bg-white/20' : ''
              }`} />
              
              <Button 
                variant="ghost" 
                className={`w-full justify-start gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                  isAIStudio 
                    ? 'text-red-300 hover:bg-red-500/20 hover:text-red-200 backdrop-blur-lg' 
                    : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                }`}
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Notifications */}
      <div className="p-6 pt-0">
        <Button 
          variant="outline" 
          className={`w-full justify-start gap-3 rounded-2xl transition-all duration-300 ${
            isAIStudio 
              ? 'border-white/20 text-white/80 hover:text-white hover:bg-white/15 backdrop-blur-lg' 
              : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            <Badge className={`absolute -top-2 -right-2 w-4 h-4 p-0 flex items-center justify-center text-[10px] transition-all duration-300 ${
              isAIStudio 
                ? 'bg-red-400/90 backdrop-blur-lg text-white' 
                : 'bg-red-500 text-white'
            }`}>
              3
            </Badge>
          </div>
          <span className="tracking-tight">Notifications</span>
        </Button>
      </div>
    </div>
  )
} 