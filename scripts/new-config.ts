/**
 * Scaffolds a fresh config: a placeholder machine and one placeholder pile,
 * ready to run and iterate on rather than the worked `.dist` example's
 * sixteen fake piles.
 *
 * Neither half is truly empty — `parseMachine` needs at least two
 * programmes, one temperature, one spin and two iron settings to draw
 * anything at all (a dial needs an off position and one more to be a dial;
 * a thermostat ring needs two positions to have a ring), and the chart
 * parser refuses zero rows outright. Built from the real `Machine`/
 * `Config`/`Instruction` types rather than hand-written JSON, so it's
 * guaranteed to load — `bun run generate` works on it immediately.
 */
import type { Config, Instruction, Machine } from "@washy-washy/core";
import { writeConfig } from "./write-config";

export const DEFAULT_OUT_PATH = "data/washy-washy.json";

export function skeletonConfig(): Config {
  const machine: Machine = {
    washer: {
      name: "Your washing machine",
      capacity: "",
      programs: ["Off", "Programme 1"],
      temperatures: ["cold"],
      spins: ["0"],
      options: [],
    },
    iron: {
      name: "Your iron",
      settings: [
        { key: "1", dots: "", label: "1", detail: "", steam: false },
        { key: "2", dots: "", label: "2", detail: "", steam: false },
      ],
    },
  };
  const pile: Instruction = {
    clothingType: "Example pile",
    detergent: "",
    fabricSoftener: false,
    temperature: "cold",
    spin: "0",
    duration: "",
    program: "Programme 1",
    options: [],
    ironing: false,
    ironingNotes: "",
    ironSetting: "",
    drying: "",
    colourGroup: "any",
    mixTags: [],
    notes: "",
    referenceName: "",
    referenceLink: "",
  };
  return { machine, chart: [pile] };
}

if (import.meta.main) {
  const [path = DEFAULT_OUT_PATH] = Bun.argv.slice(2);

  if (await Bun.file(path).exists()) {
    console.error(`${path} already exists — remove it first if you want to start over`);
    process.exit(1);
  }

  await writeConfig(path, skeletonConfig());
  console.log(`wrote ${path}`);
}
