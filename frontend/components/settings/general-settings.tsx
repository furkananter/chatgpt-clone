"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export function GeneralSettings() {
  const [language, setLanguage] = useState("en");
  const [autoSave, setAutoSave] = useState(true);
  const [sendOnEnter, setSendOnEnter] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">General Settings</h2>
        <p className="text-muted-foreground mb-6">
          Manage your general preferences and behavior.
        </p>
      </div>

      {/* Language Settings */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
            <SelectItem value="tr">Türkçe</SelectItem>
            <SelectItem value="auto">Auto-detect</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose your preferred language for the interface.
        </p>
      </div>

      <Separator />

      {/* Chat Behavior */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Chat Behavior</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">
              Auto-save conversations
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically save your chat history
            </p>
          </div>
          <Switch checked={autoSave} onCheckedChange={setAutoSave} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Send message on Enter</Label>
            <p className="text-xs text-muted-foreground">
              Use Shift+Enter for new lines
            </p>
          </div>
          <Switch checked={sendOnEnter} onCheckedChange={setSendOnEnter} />
        </div>
      </div>

      <Separator />

      {/* Data Management */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Data Management</h3>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            Import Data
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="destructive" size="sm">
            Clear All Conversations
          </Button>
        </div>
      </div>
    </div>
  );
}
