"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Download, Upload, Trash2 } from "lucide-react";
import { useState } from "react";
import { useChats } from "@/hooks/use-chats";

export function DataSettings() {
  const [dataCollection, setDataCollection] = useState(true);
  const [improveModel, setImproveModel] = useState(false);
  const { chats } = useChats();

  const handleExportData = () => {
    const data = {
      chats,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatgpt-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearAllData = () => {
    if (
      confirm(
        "Are you sure you want to delete all your conversations? This action cannot be undone."
      )
    ) {
      // Clear all chats logic would go here
      console.log("Clearing all data...");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Data Controls</h2>
        <p className="text-muted-foreground mb-6">
          Manage your data, privacy, and export options.
        </p>
      </div>

      {/* Data Collection */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Data Collection</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Save conversations</Label>
            <p className="text-xs text-muted-foreground">
              Store your chat history for future reference
            </p>
          </div>
          <Switch
            checked={dataCollection}
            onCheckedChange={setDataCollection}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">
              Help improve our models
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow your conversations to be used for model training
            </p>
          </div>
          <Switch checked={improveModel} onCheckedChange={setImproveModel} />
        </div>
      </div>

      <Separator />

      {/* Data Export */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Export Data</h3>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Download your data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export all your conversations and settings in JSON format.
            </p>
            <Button onClick={handleExportData} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export All Data
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Data Import */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Import Data</h3>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import conversations from a previously exported file.
            </p>
            <Button variant="outline" className="w-full bg-transparent">
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Data Deletion */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Delete Data</h3>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permanently delete all your conversations and data. This action
              cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={handleClearAllData}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Conversations
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Storage Info */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Storage Information</h3>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total conversations</p>
                <p className="font-medium">{chats.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Storage used</p>
                <p className="font-medium">
                  ~{Math.round(JSON.stringify(chats).length / 1024)} KB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
