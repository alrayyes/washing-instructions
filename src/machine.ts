/**
 * The appliances this chart is drawn for. Everything the PDFs render — dial
 * angles, which chips exist, what a valid CSV value is — comes from here, so
 * swapping in a different machine is a matter of editing this file only.
 */

/** Bosch Serie 6 VarioPerfect, 1-8 kg, EcoSilence Drive. Dutch fascia. */
export const washer = {
  name: "Bosch Serie 6 VarioPerfect",
  capacity: "1–8 kg",

  /**
   * Dial labels in physical order, starting at "Uit" (12 o'clock) and running
   * clockwise. Index doubles as the dial angle, so the order matters.
   */
  programs: [
    "Uit",
    "Katoen",
    "Katoen + Voorwas",
    "Kreukherstellend",
    "Kreukherstellend + Voorwas",
    "Snel + Mix",
    "Fijn/Zijde",
    "Wol",
    "Spoelen/Centrifugeren",
    "Afpompen",
    "Voorzichtig centrifugeren",
    "Extra snel 15'",
    "Kreukherstellend speciaal",
    "Extra fijn",
    "Sport",
    "Allergie +",
  ],

  /** Temperatures the display steps through. "koud" is the snowflake. */
  temperatures: ["koud", "20", "30", "40", "60", "90"],

  /** Spin speeds in rpm. "0" is the no-spin (drain only) setting. */
  spins: ["0", "400", "600", "800", "1200", "1400"],

  /** The four option buttons left of the display. */
  options: ["Speed Perfect", "Eco Perfect", "Licht strijken", "Extra spoelen"],
} as const;

/** Tefal Easygliss Plus, 2400 W, Durilium Airglide soleplate. */
export const iron = {
  name: "Tefal Easygliss Plus",

  /**
   * Thermostat ring positions, MIN through MAX. `steam` marks the shaded zone
   * on the dial where the iron actually produces steam.
   */
  settings: [
    { key: "min", dots: "", label: "MIN", detail: "no heat", steam: false },
    { key: "1", dots: "•", label: "•", detail: "synthetics · 110 °C", steam: false },
    { key: "2", dots: "••", label: "••", detail: "wool, silk · 150 °C", steam: true },
    { key: "3", dots: "•••", label: "•••", detail: "cotton, linen · 200 °C", steam: true },
    { key: "max", dots: "•••", label: "MAX", detail: "linen · 230 °C", steam: true },
  ],
} as const;

export type ProgramName = (typeof washer.programs)[number];
export type Temperature = (typeof washer.temperatures)[number];
export type Spin = (typeof washer.spins)[number];
export type OptionName = (typeof washer.options)[number];
export type IronSettingKey = (typeof iron.settings)[number]["key"];

export const ironSettingKeys = iron.settings.map((s) => s.key);

export function ironSetting(key: string) {
  return iron.settings.find((s) => s.key === key);
}
