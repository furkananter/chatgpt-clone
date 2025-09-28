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
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { useUIStore } from "@/lib/stores/ui-store";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AppearanceSettings() {
  const { theme, setTheme } = useUIStore();
  const [fontSize, setFontSize] = useState("medium");
  const [compactMode, setCompactMode] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);

  const themeOptions = [
    { value: "light", label: "Light", description: "Light theme" },
    { value: "dark", label: "Dark", description: "Dark theme" },
    { value: "system", label: "System", description: "Use system preference" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Appearance Settings</h2>
        <p className="text-muted-foreground mb-6">
          Customize the look and feel of your interface.
        </p>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Theme</Label>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => (
            <Card
              key={option.value}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                theme === option.value && "ring-2 ring-primary"
              )}
              onClick={() =>
                setTheme(option.value as "light" | "dark" | "system")
              }
            >
              <CardContent className="p-4 text-center">
                <div
                  className={cn(
                    "w-full h-16 rounded-md mb-2",
                    option.value === "light" && "bg-white border",
                    option.value === "dark" && "bg-gray-900",
                    option.value === "system" &&
                      "bg-gradient-to-r from-white to-gray-900"
                  )}
                />
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Font Size */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Font size</Label>
        <Select value={fontSize} onValueChange={setFontSize}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Adjust the size of text in conversations.
        </p>
      </div>

      <Separator />

      {/* Display Options */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Display Options</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Compact mode</Label>
            <p className="text-xs text-muted-foreground">
              Reduce spacing between messages
            </p>
          </div>
          <Switch checked={compactMode} onCheckedChange={setCompactMode} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Show timestamps</Label>
            <p className="text-xs text-muted-foreground">
              Display message timestamps
            </p>
          </div>
          <Switch
            checked={showTimestamps}
            onCheckedChange={setShowTimestamps}
          />
        </div>
      </div>

      <Separator />

      {/* Sidebar Options */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Sidebar</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Always show sidebar</Label>
            <p className="text-xs text-muted-foreground">
              Keep sidebar visible on larger screens
            </p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  );
}
