"use client";

import { useState, useEffect } from "react";

interface Engine {
  id: string;
  name: string;
  speed: string;
  quality: string;
  costPer1kTokens: number;
}

interface EngineConfigProps {
  value: {
    preset: string;
    custom?: {
      planning: string;
      architecture: string;
      database: string;
      backend: string;
      frontend: string;
      testing: string;
    };
  };
  onChange: (config: any) => void;
}

const PRESETS = [
  {
    id: "fast",
    name: "Fast Generation",
    description: "Use Cerebras for all tasks - fastest generation",
    icon: "⚡",
    badge: "Fastest",
    badgeColor: "bg-yellow-500",
  },
  {
    id: "hybrid",
    name: "Hybrid Generation",
    description:
      "Balance speed and quality - Claude for critical tasks, Cerebras for routine code",
    icon: "⚖️",
    badge: "Recommended",
    badgeColor: "bg-blue-500",
  },
  {
    id: "quality",
    name: "Quality Generation",
    description: "Use Claude for all tasks - highest quality",
    icon: "✨",
    badge: "Best Quality",
    badgeColor: "bg-purple-500",
  },
];

const PHASES = [
  { id: "planning", name: "Planning & Architecture", icon: "📋" },
  { id: "database", name: "Database Schema", icon: "🗄️" },
  { id: "backend", name: "Backend API", icon: "⚙️" },
  { id: "frontend", name: "Frontend UI", icon: "🎨" },
  { id: "testing", name: "Test Suites", icon: "🧪" },
];

export default function EngineConfig({ value, onChange }: EngineConfigProps) {
  const [mode, setMode] = useState<"preset" | "custom">(
    value.preset === "custom" ? "custom" : "preset"
  );
  const [selectedPreset, setSelectedPreset] = useState(value.preset || "hybrid");
  const [customConfig, setCustomConfig] = useState(
    value.custom || {
      planning: "claude",
      database: "claude",
      backend: "cerebras",
      frontend: "cerebras",
      testing: "cerebras",
    }
  );
  const [engines, setEngines] = useState<Engine[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch available engines
  useEffect(() => {
    async function loadEngines() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/engines`
        );
        const data = await response.json();
        if (data.success) {
          setEngines(data.data);
        }
      } catch (error) {
        console.error("Failed to load engines:", error);
        // Fallback engines
        setEngines([
          {
            id: "claude",
            name: "Claude",
            speed: "slow",
            quality: "excellent",
            costPer1kTokens: 0.015,
          },
          {
            id: "cerebras",
            name: "Cerebras",
            speed: "ultra-fast",
            quality: "good",
            costPer1kTokens: 0.001,
          },
        ]);
      }
    }
    loadEngines();
  }, []);

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    setMode("preset");
    onChange({ preset: presetId });
  };

  const handleCustomChange = (phase: string, engineId: string) => {
    const newConfig = {
      ...customConfig,
      [phase]: engineId,
    };
    setCustomConfig(newConfig);
    onChange({ preset: "custom", custom: newConfig });
  };

  const handleModeChange = (newMode: "preset" | "custom") => {
    setMode(newMode);
    if (newMode === "preset") {
      onChange({ preset: selectedPreset });
    } else {
      onChange({ preset: "custom", custom: customConfig });
    }
  };

  const getSpeedBadgeColor = (speed: string) => {
    switch (speed) {
      case "ultra-fast":
        return "bg-green-100 text-green-800";
      case "fast":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "slow":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getQualityBadgeColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "bg-purple-100 text-purple-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => handleModeChange("preset")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            mode === "preset"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Preset Configurations
        </button>
        <button
          type="button"
          onClick={() => {
            handleModeChange("custom");
            setShowAdvanced(true);
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            mode === "custom"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Custom Configuration
        </button>
      </div>

      {/* Preset Mode */}
      {mode === "preset" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose a preset based on your priorities - speed, quality, or a balance of both.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset.id)}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedPreset === preset.id
                    ? "border-indigo-600 bg-indigo-50 shadow-lg"
                    : "border-gray-200 hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{preset.icon}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold text-white ${preset.badgeColor}`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2">{preset.name}</h3>
                <p className="text-sm text-gray-600">{preset.description}</p>
              </button>
            ))}
          </div>

          {/* Show what this preset uses */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="font-medium text-gray-700">
                Engine Details for {PRESETS.find((p) => p.id === selectedPreset)?.name}
              </span>
              <span className="text-gray-500">
                {showAdvanced ? "Hide" : "Show"} ▼
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-2">
                {PHASES.map((phase) => {
                  const engineId =
                    selectedPreset === "fast"
                      ? "cerebras"
                      : selectedPreset === "quality"
                      ? "claude"
                      : phase.id === "planning" || phase.id === "database"
                      ? "claude"
                      : "cerebras";
                  const engine = engines.find((e) => e.id === engineId);

                  return (
                    <div
                      key={phase.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{phase.icon}</span>
                        <span className="font-medium text-gray-700">{phase.name}</span>
                      </div>
                      {engine && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{engine.name}</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeedBadgeColor(
                              engine.speed
                            )}`}
                          >
                            {engine.speed}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityBadgeColor(
                              engine.quality
                            )}`}
                          >
                            {engine.quality}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Mode */}
      {mode === "custom" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select which AI engine to use for each generation phase. Mix and match for optimal
            results.
          </p>

          <div className="space-y-3">
            {PHASES.map((phase) => (
              <div
                key={phase.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{phase.icon}</span>
                    <span className="font-medium text-gray-700">{phase.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {engines.map((engine) => (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => handleCustomChange(phase.id, engine.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        customConfig[phase.id as keyof typeof customConfig] === engine.id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{engine.name}</span>
                        <div className="flex gap-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeedBadgeColor(
                              engine.speed
                            )}`}
                          >
                            {engine.speed}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityBadgeColor(
                              engine.quality
                            )}`}
                          >
                            {engine.quality}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        ${engine.costPer1kTokens.toFixed(4)} / 1K tokens
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h4 className="font-bold text-indigo-900 mb-2">Configuration Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-indigo-700">Claude tasks:</span>{" "}
                <span className="font-bold text-indigo-900">
                  {Object.values(customConfig).filter((e) => e === "claude").length}
                </span>
              </div>
              <div>
                <span className="text-indigo-700">Cerebras tasks:</span>{" "}
                <span className="font-bold text-indigo-900">
                  {Object.values(customConfig).filter((e) => e === "cerebras").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
