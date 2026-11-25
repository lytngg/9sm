// How far over the promised number a month ended. One arrow for hitting it,
// two for 10% over, three for 25% over.
export function arrows(delivered: number, target: number) {
  if (target <= 0 || delivered < target) return 0;
  const ratio = delivered / target;
  return ratio >= 1.25 ? 3 : ratio >= 1.1 ? 2 : 1;
}

export const monthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
export const prevMonthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
export const monthName = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleString("en", { month: "long", timeZone: "UTC" });

export const EVENT_CATEGORIES = [
  "Football",
  "American football",
  "Basketball",
  "Baseball",
  "Ice hockey",
  "Combat sports",
  "Tennis",
  "Golf",
  "Motorsport",
  "Horse racing",
  "Cricket",
  "Rugby",
  "Esports",
  "Other",
];
export const EVENT_REGIONS = ["Global", "US", "Canada", "UK", "Europe", "LatAm", "Brazil", "Asia", "Africa", "Middle East"];
export const EVENT_LEVELS = ["None", "Only the biggest", "Big events", "Everything"];
