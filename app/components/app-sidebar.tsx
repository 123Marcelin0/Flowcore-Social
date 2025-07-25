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
  FileText,
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
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

type Section = "dashboard" | "content" | "interactions" | "ideas" | "settings"

interface AppSidebarProps {
  activeSection: Section
  setActiveSection: (section: Section) => void
  onLogout?: () => void
}

export function AppSidebar({ activeSection, setActiveSection, onLogout }: AppSidebarProps) {
  const { user, userProfile } = useAuth()

  const menuItems = [
    { id: "dashboard" as Section, label: "Dashboard", icon: Home },
    { id: "content" as Section, label: "Content Hub", icon: FileText },
    { id: "interactions" as Section, label: "KI-Interaktionen", icon: MessageSquare },
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

  return (
    <div className="w-80 bg-white border-r border-gray-100 h-screen flex flex-col rounded-tr-2xl">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex items-baseline">
            <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] text-2xl tracking-tight" style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}>
              flowcore
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 font-medium text-lg tracking-tight ml-1" style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}>
              social
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-6">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              variant="ghost"
              className={`w-full justify-start gap-3 px-4 py-2 text-sm rounded-xl transition-all duration-200 ${
                activeSection === item.id
                  ? "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600 border border-teal-100"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <item.icon className={`w-4 h-4 ${
                activeSection === item.id 
                  ? "text-teal-600" 
                  : "text-gray-500"
              }`} />
              <span className="font-medium tracking-tight">{item.label}</span>
            </Button>
          ))}
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-6 border-t border-gray-100">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 px-3 py-2 h-auto hover:bg-gray-50 rounded-xl transition-colors"
            >
              <Avatar className="w-9 h-9 border-2 border-white shadow-sm">
                <AvatarImage src={userAvatar} alt={userDisplayName} />
                <AvatarFallback className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900 tracking-tight truncate">{userDisplayName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 border-gray-200 rounded-xl shadow-xl" align="start">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                  <AvatarImage src={userAvatar} alt={userDisplayName} />
                  <AvatarFallback className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900 truncate">{userDisplayName}</p>
                  <p className="text-sm text-gray-500 truncate">{userEmail}</p>
                  <Badge variant="secondary" className={`mt-1 text-xs ${getSubscriptionColor(subscriptionTier)}`}>
                    {getSubscriptionLabel(subscriptionTier)}
                  </Badge>
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg">
                  <User className="w-4 h-4 text-gray-500" />
                  Konto-Einstellungen
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  Abrechnung & Pläne
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg">
                  <Shield className="w-4 h-4 text-gray-500" />
                  Datenschutz & Sicherheit
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium hover:bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-500" />
                  E-Mail-Einstellungen
                </Button>
              </div>
              
              <Separator className="my-3" />
              
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
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
          className="w-full justify-start gap-3 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0 flex items-center justify-center bg-red-500 text-[10px]">
              3
            </Badge>
          </div>
          <span className="tracking-tight">Notifications</span>
        </Button>
      </div>
    </div>
  )
} 