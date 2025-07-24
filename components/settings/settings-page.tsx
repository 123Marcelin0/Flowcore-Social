"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Plus,
  Check,
  AlertTriangle,
  X,
  Trash2,
  Copy,
  RefreshCw,
  Shield,
  Mail,
  Key,
  ExternalLink,
  AlertCircle,
  Loader2,
  CheckCircle,
  Video
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface SocialAccount {
  id: string
  platform: string
  username: string
  status: "connected" | "reauth_required" | "error"
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const connectedAccounts: SocialAccount[] = [
  {
    id: "1",
    platform: "Instagram",
    username: "@socialflow_official",
    status: "connected",
    icon: Instagram,
    color: "text-pink-600",
  },
  {
    id: "2",
    platform: "Facebook",
    username: "SocialFlow Business",
    status: "connected",
    icon: Facebook,
    color: "text-blue-600",
  },
  {
    id: "3",
    platform: "Twitter",
    username: "@socialflow",
    status: "reauth_required",
    icon: Twitter,
    color: "text-blue-400",
  },
  {
    id: "4",
    platform: "LinkedIn",
    username: "SocialFlow Company",
    status: "error",
    icon: Linkedin,
    color: "text-blue-700",
  },
  {
    id: "5",
    platform: "TikTok",
    username: "@socialflow",
    status: "connected",
    icon: Video,
    color: "text-black",
  },
]

const availablePlatforms = [
  { name: "TikTok", icon: "T", color: "bg-black text-white" },
  { name: "YouTube", icon: "Y", color: "bg-red-600 text-white" },
  { name: "Pinterest", icon: "P", color: "bg-red-500 text-white" },
]

export function SettingsPage() {
  const [aiAutoReplies, setAiAutoReplies] = useState(true)
  const [confirmationRequired, setConfirmationRequired] = useState(true)
  const [aiResponseTone, setAiResponseTone] = useState("professional")
  const [inAppNotifications, setInAppNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [newInteractions, setNewInteractions] = useState(true)
  const [postUpdates, setPostUpdates] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [webhookUrl] = useState("https://api.socialflow.com/webhooks/abc123def456")

  const [selectedAccount, setSelectedAccount] = useState<SocialAccount | null>(null)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    apiKey: "",
    accessToken: "",
    pageId: "",
    apiSecret: "",
    clientId: "",
    clientSecret: "",
  })

  const [validationState, setValidationState] = useState<{
    [key: string]: {
      isValid: boolean
      isValidating: boolean
      message: string
      type: "success" | "error" | "warning" | "info"
    }
  }>({})

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateInstagramCredentials = (email: string, password: string) => {
    const errors = []
    if (!email) errors.push("Email is required")
    else if (!validateEmail(email)) errors.push("Invalid email format")
    if (!password) errors.push("Password is required")
    else if (password.length < 6) errors.push("Password must be at least 6 characters")
    return errors
  }

  const validateTwitterCredentials = (apiKey: string, apiSecret: string) => {
    const errors = []
    if (!apiKey) errors.push("API Key is required")
    else if (!apiKey.startsWith("sk_") && !apiKey.match(/^[A-Za-z0-9]{25}$/)) {
      errors.push("Invalid Twitter API Key format")
    }
    if (!apiSecret) errors.push("API Secret is required")
    else if (apiSecret.length < 40) errors.push("API Secret appears to be incomplete")
    return errors
  }

  const validateFacebookCredentials = (accessToken: string, pageId: string) => {
    const errors = []
    if (!accessToken) errors.push("Access Token is required")
    else if (!accessToken.startsWith("EAA") && !accessToken.match(/^[A-Za-z0-9_-]+$/)) {
      errors.push("Invalid Facebook Access Token format")
    }
    if (!pageId) errors.push("Page ID is required")
    else if (!pageId.match(/^\d+$/)) errors.push("Page ID must be numeric")
    return errors
  }

  const validateLinkedInCredentials = (clientId: string, clientSecret: string) => {
    const errors = []
    if (!clientId) errors.push("Client ID is required")
    else if (!clientId.match(/^[0-9a-z]{8,}$/)) errors.push("Invalid LinkedIn Client ID format")
    if (!clientSecret) errors.push("Client Secret is required")
    else if (clientSecret.length < 16) errors.push("Client Secret appears to be incomplete")
    return errors
  }

  const validateYouTubeCredentials = (email: string, apiKey: string) => {
    const errors = []
    if (!email) errors.push("Google account email is required")
    else if (!validateEmail(email)) errors.push("Invalid email format")
    else if (!email.includes("gmail.com") && !email.includes("google.com")) {
      errors.push("Please use a Google account email")
    }
    if (!apiKey) errors.push("YouTube API Key is required")
    else if (!apiKey.startsWith("AIza") || apiKey.length < 35) {
      errors.push("Invalid YouTube API Key format")
    }
    return errors
  }

  const validatePinterestCredentials = (email: string, accessToken: string) => {
    const errors = []
    if (!email) errors.push("Email is required")
    else if (!validateEmail(email)) errors.push("Invalid email format")
    if (!accessToken) errors.push("Access Token is required")
    else if (!accessToken.startsWith("pina_") && !accessToken.startsWith("AdkU")) {
      errors.push("Invalid Pinterest Access Token format")
    }
    return errors
  }

  const validateTikTokCredentials = (email: string, password: string) => {
    const errors = []
    if (!email) errors.push("Email is required")
    else if (!validateEmail(email)) errors.push("Invalid email format")
    if (!password) errors.push("Password is required")
    else if (password.length < 6) errors.push("Password must be at least 6 characters")
    return errors
  }

  const performValidation = async (platform: string, credentials: any) => {
    const fieldKey = `${platform.toLowerCase()}_validation`

    setValidationState((prev) => ({
      ...prev,
      [fieldKey]: {
        isValid: false,
        isValidating: true,
        message: "Validating credentials...",
        type: "info",
      },
    }))

    // Simulate API validation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    let errors: string[] = []

    switch (platform.toLowerCase()) {
      case "instagram":
        errors = validateInstagramCredentials(credentials.email, credentials.password)
        break
      case "twitter":
        errors = validateTwitterCredentials(credentials.apiKey, credentials.apiSecret || "dummy_secret")
        break
      case "facebook":
        errors = validateFacebookCredentials(credentials.accessToken, credentials.pageId || "123456789")
        break
      case "linkedin":
        errors = validateLinkedInCredentials(
          credentials.clientId || "dummy_id",
          credentials.clientSecret || "dummy_secret",
        )
        break
      case "youtube":
        errors = validateYouTubeCredentials(credentials.email, credentials.apiKey)
        break
      case "pinterest":
        errors = validatePinterestCredentials(credentials.email, credentials.accessToken)
        break
      case "tiktok":
        errors = validateTikTokCredentials(credentials.email, credentials.password)
        break
    }

    const isValid = errors.length === 0

    setValidationState((prev) => ({
      ...prev,
      [fieldKey]: {
        isValid,
        isValidating: false,
        message: isValid ? "Credentials validated successfully!" : errors[0],
        type: isValid ? "success" : "error",
      },
    }))

    return isValid
  }

  useEffect(() => {
    const platform = selectedAccount?.platform || selectedPlatform
    if (!platform) return

    const hasRequiredFields = () => {
      switch (platform.toLowerCase()) {
        case "instagram":
        case "tiktok":
          return credentials.email && credentials.password
        case "twitter":
          return credentials.apiKey
        case "facebook":
          return credentials.accessToken
        case "linkedin":
          return false // Requires both client ID and secret
        case "youtube":
          return credentials.email && credentials.apiKey
        case "pinterest":
          return credentials.email && credentials.accessToken
        default:
          return false
      }
    }

    if (hasRequiredFields()) {
      const timeoutId = setTimeout(() => {
        performValidation(platform, credentials)
      }, 800) // Debounce validation

      return () => clearTimeout(timeoutId)
    } else {
      // Clear validation state if required fields are empty
      const fieldKey = `${platform.toLowerCase()}_validation`
      setValidationState((prev) => ({
        ...prev,
        [fieldKey]: {
          isValid: false,
          isValidating: false,
          message: "",
          type: "info",
        },
      }))
    }
  }, [credentials, selectedAccount?.platform, selectedPlatform])

  const ValidationIndicator = ({ platform }: { platform: string }) => {
    const fieldKey = `${platform.toLowerCase()}_validation`
    const validation = validationState[fieldKey]

    if (!validation || !validation.message) return null

    const getIcon = () => {
      if (validation.isValidating) return <Loader2 className="w-4 h-4 animate-spin" />
      if (validation.isValid) return <CheckCircle className="w-4 h-4" />
      return <AlertCircle className="w-4 h-4" />
    }

    const getColorClasses = () => {
      if (validation.isValidating) return "text-blue-600 bg-blue-50 border-blue-200"
      if (validation.isValid) return "text-green-600 bg-green-50 border-green-200"
      return "text-red-600 bg-red-50 border-red-200"
    }

    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${getColorClasses()}`}>
        {getIcon()}
        <span className="text-sm font-medium">{validation.message}</span>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <Check className="w-4 h-4 text-green-600" />
      case "reauth_required":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case "error":
        return <X className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected"
      case "reauth_required":
        return "Re-auth Required"
      case "error":
        return "Connection Error"
      default:
        return ""
    }
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    // You could add a toast notification here
  }

  const handleManageAccount = (account: SocialAccount) => {
    setSelectedAccount(account)
    setCredentials({
      email: account.platform === "Instagram" ? "user@example.com" : "",
      password: "",
      apiKey: account.platform === "Twitter" ? "sk_test_..." : "",
      accessToken: account.platform === "Facebook" ? "EAABw..." : "",
      pageId: "",
      apiSecret: "",
      clientId: "",
      clientSecret: "",
    })
    setIsManageDialogOpen(true)
  }

  const handleConnectPlatform = (platformName: string) => {
    setSelectedPlatform(platformName)
    setCredentials({
      email: "",
      password: "",
      apiKey: "",
      accessToken: "",
      pageId: "",
      apiSecret: "",
      clientId: "",
      clientSecret: "",
    })
    setIsConnectDialogOpen(true)
  }

  const handleSaveCredentials = async () => {
    const platform = selectedAccount?.platform || selectedPlatform
    const fieldKey = `${platform?.toLowerCase()}_validation`
    const validation = validationState[fieldKey]

    if (validation && !validation.isValid && !validation.isValidating) {
      // Don't save if validation failed
      return
    }

    // Here you would typically make an API call to save the credentials
    setIsManageDialogOpen(false)
    setIsConnectDialogOpen(false)
    setCredentials({
      email: "",
      password: "",
      apiKey: "",
      accessToken: "",
      pageId: "",
      apiSecret: "",
      clientId: "",
      clientSecret: "",
    })

    // Clear validation state
    setValidationState((prev) => ({
      ...prev,
      [fieldKey]: {
        isValid: false,
        isValidating: false,
        message: "",
        type: "info",
      },
    }))
  }

  const handleDisconnectAccount = (accountId: string) => {
    // Here you would typically make an API call to disconnect the account
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account preferences and integrations</p>
          </div>
        </div>
      </div>

      {/* Connected Social Media Accounts */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Connected Accounts</h2>
            <p className="text-gray-600 mt-1">Manage your connected social media platforms</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedAccounts.map((account) => (
              <div
                key={account.id}
                className="group p-4 border border-gray-200 rounded-xl hover:border-teal-200 hover:bg-teal-50/50 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
                      <account.icon className={`w-5 h-5 ${account.color}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{account.platform}</h3>
                      <p className="text-sm text-gray-600">{account.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(account.status)}
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        account.status === "connected"
                          ? "text-green-700 bg-green-100"
                          : account.status === "reauth_required"
                            ? "text-orange-700 bg-orange-100"
                            : "text-red-700 bg-red-100"
                      }`}
                    >
                      {getStatusText(account.status)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-sm h-8 rounded-lg border-gray-200 hover:bg-gray-50"
                    onClick={() => handleManageAccount(account)}
                  >
                    Manage
                  </Button>
                  {account.status !== "connected" && (
                    <Button size="sm" className="flex-1 h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm">
                      Reconnect
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="px-2 h-8 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Account */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Platform</h3>
            <div className="flex flex-wrap gap-3">
              {availablePlatforms.map((platform) => (
                <Button
                  key={platform.name}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl px-4 py-2 h-10 shadow-sm"
                  onClick={() => handleConnectPlatform(platform.name)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {platform.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Automation Settings */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">AI Automation</h2>
            <p className="text-gray-600 mt-1">Configure how AI assists with your social media management</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="space-y-1">
                <Label className="text-base font-medium text-gray-900">Enable AI Auto-Replies</Label>
                <p className="text-sm text-gray-600">Automatically respond to comments and messages using AI</p>
              </div>
              <Switch
                checked={aiAutoReplies}
                onCheckedChange={setAiAutoReplies}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="space-y-1">
                <Label className="text-base font-medium text-gray-900">Confirmation Required</Label>
                <p className="text-sm text-gray-600">Review AI-generated responses before they are sent</p>
              </div>
              <Switch
                checked={confirmationRequired}
                onCheckedChange={setConfirmationRequired}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="space-y-3">
                <Label className="text-base font-medium text-gray-900">Default AI Response Tone</Label>
                <Select value={aiResponseTone} onValueChange={setAiResponseTone}>
                  <SelectTrigger className="w-full max-w-xs border-gray-200 rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600">Choose the default tone for AI-generated responses</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
            <p className="text-gray-600 mt-1">Control how and when you receive notifications</p>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium text-gray-900">In-App Notifications</Label>
                  <p className="text-sm text-gray-600">Receive notifications within the application</p>
                </div>
                <Switch
                  checked={inAppNotifications}
                  onCheckedChange={setInAppNotifications}
                  className="data-[state=checked]:bg-teal-600"
                />
              </div>

              {inAppNotifications && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">New Interactions</Label>
                    <Switch
                      checked={newInteractions}
                      onCheckedChange={setNewInteractions}
                      className="data-[state=checked]:bg-teal-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Post Status Updates</Label>
                    <Switch
                      checked={postUpdates}
                      onCheckedChange={setPostUpdates}
                      className="data-[state=checked]:bg-teal-600"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="space-y-1">
                <Label className="text-base font-medium text-gray-900">Email Notifications</Label>
                <p className="text-sm text-gray-600">Receive notifications via email</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Settings */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Advanced Settings</h2>
            <p className="text-gray-600 mt-1">Configure advanced features and integrations</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="space-y-3">
              <Label className="text-base font-medium text-gray-900">Webhook URL</Label>
              <div className="flex gap-3">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="flex-1 bg-white border-gray-200 rounded-xl font-mono text-sm"
                />
                <Button
                  onClick={copyWebhookUrl}
                  variant="outline"
                  className="px-4 border-gray-200 rounded-xl bg-white hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="px-4 border-gray-200 rounded-xl bg-white hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Use this URL to receive webhook notifications from external services
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Account & Security */}
      <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Account & Security</h2>
            <p className="text-gray-600 mt-1">Manage your account security and authentication settings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Email Address</h3>
                  <p className="text-sm text-gray-600">user@example.com</p>
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-lg border-gray-200 bg-white hover:bg-gray-50">
                Change Email
              </Button>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Password</h3>
                  <p className="text-sm text-gray-600">Last changed 3 months ago</p>
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-lg border-gray-200 bg-white hover:bg-gray-50">
                Change Password
              </Button>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600">
                      {twoFactorEnabled ? "Enabled - Your account is protected" : "Add an extra layer of security"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {twoFactorEnabled && <Badge className="bg-green-100 text-green-700 px-3 py-1">Enabled</Badge>}
                  <Button
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={
                      twoFactorEnabled
                        ? "bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        : "bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                    }
                  >
                    {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Spacing */}
      <div className="h-4" />

      {/* Manage Account Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedAccount && (
                <>
                  <selectedAccount.icon className={`w-5 h-5 ${selectedAccount.color}`} />
                  Manage {selectedAccount.platform} Account
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Current Status</span>
                  <div className="flex items-center gap-2">
                    {selectedAccount && getStatusIcon(selectedAccount.status)}
                    <span
                      className={`text-xs font-medium ${
                        selectedAccount?.status === "connected"
                          ? "text-green-600"
                          : selectedAccount?.status === "reauth_required"
                            ? "text-orange-500"
                            : "text-red-500"
                      }`}
                    >
                      {selectedAccount && getStatusText(selectedAccount.status)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{selectedAccount?.username}</p>
              </div>

              {selectedAccount?.platform === "Instagram" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="your@email.com"
                      className={`border-gray-200 rounded-xl ${
                        credentials.email && !validateEmail(credentials.email)
                          ? "border-red-300 focus:border-red-500"
                          : credentials.email && validateEmail(credentials.email)
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    {credentials.email && !validateEmail(credentials.email) && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please enter a valid email address
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="••••••••"
                      className={`border-gray-200 rounded-xl ${
                        credentials.password && credentials.password.length < 6
                          ? "border-red-300 focus:border-red-500"
                          : credentials.password && credentials.password.length >= 6
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    {credentials.password && credentials.password.length < 6 && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Password must be at least 6 characters
                      </p>
                    )}
                  </div>
                  <ValidationIndicator platform="Instagram" />
                </>
              )}

              {selectedAccount?.platform === "Twitter" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      value={credentials.apiKey}
                      onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                      placeholder="25-character alphanumeric key"
                      className={`border-gray-200 rounded-xl font-mono text-sm ${
                        credentials.apiKey && !credentials.apiKey.match(/^[A-Za-z0-9]{25}$/)
                          ? "border-red-300 focus:border-red-500"
                          : credentials.apiKey && credentials.apiKey.match(/^[A-Za-z0-9]{25}$/)
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    {credentials.apiKey && !credentials.apiKey.match(/^[A-Za-z0-9]{25}$/) && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        API Key should be 25 alphanumeric characters
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      placeholder="••••••••"
                      className="border-gray-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <ValidationIndicator platform="Twitter" />
                </>
              )}

              {selectedAccount?.platform === "Facebook" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Access Token</Label>
                    <Input
                      id="accessToken"
                      value={credentials.accessToken}
                      onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                      placeholder="EAABw..."
                      className={`border-gray-200 rounded-xl font-mono text-sm ${
                        credentials.accessToken && !credentials.accessToken.startsWith("EAA")
                          ? "border-red-300 focus:border-red-500"
                          : credentials.accessToken && credentials.accessToken.startsWith("EAA")
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    {credentials.accessToken && !credentials.accessToken.startsWith("EAA") && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Facebook tokens typically start with "EAA"
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pageId">Page ID</Label>
                    <Input
                      id="pageId"
                      placeholder="123456789"
                      className="border-gray-200 rounded-xl"
                      onChange={(e) => {
                        const value = e.target.value
                        if (!/^\d*$/.test(value)) return // Only allow numbers
                        setCredentials({ ...credentials, pageId: value })
                      }}
                    />
                  </div>
                  <ValidationIndicator platform="Facebook" />
                </>
              )}

              {selectedAccount?.platform === "LinkedIn" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      placeholder="86xyz..."
                      className="border-gray-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      placeholder="••••••••"
                      className="border-gray-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                </>
              )}

              {selectedAccount?.platform === "TikTok" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="your@email.com"
                      className={`border-gray-200 rounded-xl ${
                        credentials.email && !validateEmail(credentials.email)
                          ? "border-red-300 focus:border-red-500"
                          : credentials.email && validateEmail(credentials.email)
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    {credentials.email && !validateEmail(credentials.email) && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please enter a valid email address
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="••••••••"
                      className="border-gray-200 rounded-xl"
                    />
                  </div>
                  <ValidationIndicator platform="TikTok" />
                </>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => selectedAccount && handleDisconnectAccount(selectedAccount.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCredentials}
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={validationState[`${selectedAccount?.platform?.toLowerCase()}_validation`]?.isValidating}
                >
                  {validationState[`${selectedAccount?.platform?.toLowerCase()}_validation`]?.isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connect New Platform Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-teal-600" />
              Connect {selectedPlatform}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
              <p className="text-sm text-teal-700">
                Enter your {selectedPlatform} credentials to connect your account. Your information is encrypted and
                stored securely.
              </p>
            </div>

            <div className="space-y-4">
              {selectedPlatform === "TikTok" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok-email">Email Address</Label>
                    <Input
                      id="tiktok-email"
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="your@email.com"
                      className="border-gray-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok-password">Password</Label>
                    <Input
                      id="tiktok-password"
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="••••••••"
                      className="border-gray-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              {selectedPlatform === "YouTube" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="youtube-email">Google Account Email</Label>
                    <Input
                      id="youtube-email"
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="your@gmail.com"
                      className={`border-gray-200 rounded-xl ${
                        credentials.email &&
                        (
                          !validateEmail(credentials.email) ||
                            (!credentials.email.includes("gmail.com") && !credentials.email.includes("google.com"))
                        )
                          ? "border-red-300 focus:border-red-500"
                          : credentials.email &&
                              validateEmail(credentials.email) &&
                              (credentials.email.includes("gmail.com") || credentials.email.includes("google.com"))
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    {credentials.email && !validateEmail(credentials.email) && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please enter a valid email address
                      </p>
                    )}
                    {credentials.email &&
                      validateEmail(credentials.email) &&
                      !credentials.email.includes("gmail.com") &&
                      !credentials.email.includes("google.com") && (
                        <p className="text-sm text-orange-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Please use a Google account email
                        </p>
                      )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube-apikey">YouTube API Key</Label>
                    <Input
                      id="youtube-apikey"
                      value={credentials.apiKey}
                      onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                      placeholder="AIza..."
                      className={`border-gray-200 rounded-xl font-mono text-sm ${
                        credentials.apiKey && (!credentials.apiKey.startsWith("AIza") || credentials.apiKey.length < 35)
                          ? "border-red-300 focus:border-red-500"
                          : credentials.apiKey &&
                              credentials.apiKey.startsWith("AIza") &&
                              credentials.apiKey.length >= 35
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    {credentials.apiKey &&
                      (!credentials.apiKey.startsWith("AIza") || credentials.apiKey.length < 35) && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          YouTube API keys start with "AIza" and are 39+ characters
                        </p>
                      )}
                  </div>
                  <ValidationIndicator platform="YouTube" />
                </>
              )}

              {selectedPlatform === "Pinterest" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pinterest-email">Email Address</Label>
                    <Input
                      id="pinterest-email"
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="your@email.com"
                      className={`border-gray-200 rounded-xl ${
                        credentials.email && !validateEmail(credentials.email)
                          ? "border-red-300 focus:border-red-500"
                          : credentials.email && validateEmail(credentials.email)
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pinterest-token">Access Token</Label>
                    <Input
                      id="pinterest-token"
                      value={credentials.accessToken}
                      onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                      placeholder="pina_..."
                      className={`border-gray-200 rounded-xl font-mono text-sm ${
                        credentials.accessToken &&
                        !credentials.accessToken.startsWith("pina_") &&
                        !credentials.accessToken.startsWith("AdkU")
                          ? "border-red-300 focus:border-red-500"
                          : credentials.accessToken &&
                              (credentials.accessToken.startsWith("pina_") ||
                                credentials.accessToken.startsWith("AdkU"))
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    {credentials.accessToken &&
                      !credentials.accessToken.startsWith("pina_") &&
                      !credentials.accessToken.startsWith("AdkU") && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Pinterest tokens typically start with "pina_" or "AdkU"
                        </p>
                      )}
                  </div>
                  <ValidationIndicator platform="Pinterest" />
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setIsConnectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveCredentials}
                className="bg-teal-600 hover:bg-teal-700"
                disabled={validationState[`${selectedPlatform?.toLowerCase()}_validation`]?.isValidating}
              >
                {validationState[`${selectedPlatform?.toLowerCase()}_validation`]?.isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Connect Account"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
