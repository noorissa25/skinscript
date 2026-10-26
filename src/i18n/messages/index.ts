import type { Locale } from "../locales";
import { ar } from "./ar";
import { en, type Messages } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { hi } from "./hi";
import { zh } from "./zh";

export type { Messages };

export const messages: Record<Locale, Messages> = { en, es, fr, zh, hi, ar };
