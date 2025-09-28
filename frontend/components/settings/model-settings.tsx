"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChatStore } from "@/lib/stores/chat-store";
import { useState } from "react";

export function ModelSettings() {
  const { selectedModel, switchModel } = useChatStore();
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2048]);
  const [streamResponses, setStreamResponses] = useState(true);

  const models = [
    {
      id: "gpt-5",
      name: "GPT-5",
      description: "Most capable model, best for complex tasks",
      badge: "Latest",
      capabilities: ["Text", "Code", "Analysis", "Images"],
    },
    {
      id: "claude-sonnet-4",
      name: "Claude Sonnet 4",
      description: "Fast and efficient for most tasks",
      badge: "Fast",
      capabilities: ["Text", "Code", "Images"],
    },
    {
      id: "gpt-5-thinking",
      name: "GPT-5 Thinking",
      description: "Can understand and analyze images",
      badge: "Thinking",
      capabilities: ["Text", "Code", "Images"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Model Settings</h2>
        <p className="text-muted-foreground mb-6">
          Configure AI model preferences and parameters.
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Available Models</Label>
        <div className="grid gap-3">
          {models.map((model) => (
            <Card
              key={model.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                selectedModel === model.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => switchModel(model.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{model.name}</CardTitle>
                  <Badge variant="secondary">{model.badge}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {model.description}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  {model.capabilities.map((capability) => (
                    <Badge
                      key={capability}
                      variant="outline"
                      className="text-xs"
                    >
                      {capability}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Model Parameters */}
      <div className="space-y-6">
        <h3 className="text-base font-medium">Model Parameters</h3>

        {/* Temperature */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Temperature</Label>
            <span className="text-sm text-muted-foreground">
              {temperature[0]}
            </span>
          </div>
          <Slider
            value={temperature}
            onValueChange={setTemperature}
            max={2}
            min={0}
            step={0.1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Controls randomness. Lower values make responses more focused and
            deterministic.
          </p>
        </div>

        {/* Max Tokens */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Max tokens</Label>
            <span className="text-sm text-muted-foreground">
              {maxTokens[0]}
            </span>
          </div>
          <Slider
            value={maxTokens}
            onValueChange={setMaxTokens}
            max={4096}
            min={256}
            step={256}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Maximum length of the model's response.
          </p>
        </div>
      </div>

      <Separator />

      {/* Response Options */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Response Options</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Stream responses</Label>
            <p className="text-xs text-muted-foreground">
              Show responses as they're generated
            </p>
          </div>
          <Switch
            checked={streamResponses}
            onCheckedChange={setStreamResponses}
          />
        </div>
      </div>
    </div>
  );
}
