"use client";

import { PERIOD_PRESETS, type PeriodPreset } from "@/types/stats";
import { MultiSelectDropdown } from "./MultiSelectDropdown";

type FilterBarProps = {
  period: PeriodPreset;
  onPeriodChange: (period: PeriodPreset) => void;
  channels: string[];
  selectedChannels: Set<string> | null;
  onChannelsChange: (next: Set<string> | null) => void;
  tags: string[];
  selectedTags: Set<string> | null;
  onTagsChange: (next: Set<string> | null) => void;
};

export function FilterBar({
  period,
  onPeriodChange,
  channels,
  selectedChannels,
  onChannelsChange,
  tags,
  selectedTags,
  onTagsChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 card p-1">
        {PERIOD_PRESETS.map((preset) => {
          const active = preset.value === period;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onPeriodChange(preset.value)}
              className={
                active
                  ? "brand-gradient text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                  : "px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text transition-colors"
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <MultiSelectDropdown
        label="Canal"
        options={channels}
        selected={selectedChannels}
        onChange={onChannelsChange}
      />
      <MultiSelectDropdown label="Tag NIO" options={tags} selected={selectedTags} onChange={onTagsChange} />
    </div>
  );
}
