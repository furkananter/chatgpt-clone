"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/lib/stores/ui-store"
import { GeneralSettings } from "./general-settings"
import { AppearanceSettings } from "./appearance-settings"
import { ModelSettings } from "./model-settings"
import { DataSettings } from "./data-settings"
import { Settings, Palette, Bot, Database, User, Shield, Bell, Keyboard } from "lucide-react"

const settingsNavItems = [
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "models", label: "Models", icon: Bot },
  { id: "data", label: "Data controls", icon: Database },
  { id: "account", label: "Account", icon: User },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
]

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, selectedSettingsSection, setSettingsSection } = useUIStore()

  const renderSettingsContent = () => {
    switch (selectedSettingsSection) {
      case "general":
        return <GeneralSettings />
      case "appearance":
        return <AppearanceSettings />
      case "models":
        return <ModelSettings />
      case "data":
        return <DataSettings />
      case "account":
        return <AccountSettings />
      case "privacy":
        return <PrivacySettings />
      case "notifications":
        return <NotificationSettings />
      case "shortcuts":
        return <ShortcutSettings />
      default:
        return <GeneralSettings />
    }
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0 z-[100]">
        <div className="flex h-full">
          {/* Settings Sidebar */}
          <div className="w-64 border-r border-border bg-muted/30">
            <div className="p-6">
              <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
            </div>

            <nav className="px-3 space-y-1">
              {settingsNavItems.map((item) => (
                <Button
                  key={item.id}
                  variant={selectedSettingsSection === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSettingsSection(item.id)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-6 overflow-y-auto">{renderSettingsContent()}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Placeholder components for other settings sections
function AccountSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
        <p className="text-muted-foreground">Manage your account information and preferences.</p>
      </div>
    </div>
  )
}

function PrivacySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
        <p className="text-muted-foreground">Control your privacy and data sharing preferences.</p>
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
        <p className="text-muted-foreground">Manage your notification preferences.</p>
      </div>
    </div>
  )
}

function ShortcutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
        <p className="text-muted-foreground">View and customize keyboard shortcuts.</p>
      </div>
    </div>
  )
}
