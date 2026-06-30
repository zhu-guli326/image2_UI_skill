import {
  Airplay,
  ArrowLeft,
  BatteryHigh,
  Camera,
  CaretDoubleLeft,
  CaretDoubleRight,
  CellSignalHigh,
  DotsThreeVertical,
  Drop,
  Fan,
  FireSimple,
  GearSix,
  House,
  LampPendant,
  Lightning,
  Minus,
  MusicNote,
  Pause,
  Play,
  Plus,
  Power,
  Snowflake,
  SpeakerHigh,
  ThermometerSimple,
  WifiHigh,
  Wind,
} from "@phosphor-icons/react";
import React from "react";

const registry = {
  air: Wind,
  back: ArrowLeft,
  battery: BatteryHigh,
  camera: Camera,
  cold: Snowflake,
  droplet: Drop,
  fan: Fan,
  flame: FireSimple,
  home: House,
  lamp: LampPendant,
  lightning: Lightning,
  minus: Minus,
  more: DotsThreeVertical,
  music: MusicNote,
  next: CaretDoubleRight,
  pause: Pause,
  play: Play,
  plus: Plus,
  power: Power,
  previous: CaretDoubleLeft,
  settings: GearSix,
  signal: CellSignalHigh,
  speaker: SpeakerHigh,
  thermometer: ThermometerSimple,
  tv: Airplay,
  wifi: WifiHigh,
};

export function UiIcon({ name, size = 20, weight = "regular", className = "", ...props }) {
  const Icon = registry[name];
  if (!Icon) return null;

  return (
    <Icon
      aria-hidden="true"
      className={`ui-icon ui-icon-${name} ${className}`}
      size={size}
      weight={weight}
      {...props}
    />
  );
}
