import { SERIES } from "./charts";
import type { Tone } from "./ui";

const NEUTRAL = "#aab2c2";

export const CUSTOMER_SEGMENTS: Record<string, { color: string; tone: Tone; hint: string }> = {
  power: { color: SERIES[0], tone: "blue", hint: "4+ orders or $400+ spent, seen in the last 90 days" },
  active: { color: SERIES[2], tone: "teal", hint: "Ordered or signed in within 30 days" },
  occasional: { color: SERIES[1], tone: "orange", hint: "Bought before, last seen 30 to 90 days ago" },
  never_bought: { color: NEUTRAL, tone: "gray", hint: "Has an account but no orders" },
  churned: { color: SERIES[3], tone: "plum", hint: "Disabled, or no orders or visits for 90+ days" },
};

export const FIRM_SEGMENTS: Record<string, { color: string; tone: Tone; hint: string }> = {
  top: { color: SERIES[0], tone: "blue", hint: "Best quarter of sellers this month" },
  active: { color: SERIES[2], tone: "teal", hint: "Regular sales in the last 30 days" },
  struggling: { color: SERIES[1], tone: "orange", hint: "Has products but 3 or fewer sold in 30 days" },
  idle: { color: NEUTRAL, tone: "gray", hint: "Registered but listed nothing" },
  churned: { color: SERIES[3], tone: "plum", hint: "Suspended, or inactive for 90+ days" },
};

export const SEGMENT_NAMES: Record<string, string> = {
  power: "Power buyer",
  active: "Active",
  occasional: "Occasional",
  never_bought: "Never bought",
  churned: "Churned",
  top: "Top seller",
  struggling: "Weak sales",
  idle: "No products",
};

export const ROLE_NAMES: Record<string, string> = {
  customer: "Customer",
  firm: "Firm",
  operator: "Operator",
  editor: "Content editor",
  boss: "Owner",
};
