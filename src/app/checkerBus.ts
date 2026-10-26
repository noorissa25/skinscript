"use client";

// Lets the marketing sections drive the checker without lifting its state into the page.
import type { SampleSource } from "@/lib/samples";

export type CheckerCommand =
  | { type: "sample"; id: string }
  | { type: "add"; name: string }
  | { type: "product"; name: string; text: string; source: SampleSource }
  | { type: "load"; products: { name: string; text: string }[] };

const EVENT = "checker:command";

export function sendToChecker(command: CheckerCommand) {
  window.dispatchEvent(new CustomEvent<CheckerCommand>(EVENT, { detail: command }));
  // Loading a sample replaces the checker, so take the person there; adding an
  // ingredient keeps them browsing and confirms on the button instead.
  if (command.type === "sample" || command.type === "load") {
    document.getElementById("check")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
}

export function onCheckerCommand(handler: (command: CheckerCommand) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<CheckerCommand>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
