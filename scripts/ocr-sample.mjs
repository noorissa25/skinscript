// Smoke-test the OCR step on public/samples/label.png without a browser.
// Downloads the Tesseract English model on first run, so it needs network and
// is not part of `npm test`. Usage: npm run ocr:sample
import { createWorker } from "tesseract.js";

const expected = ["Aqua", "Glycerin", "Niacinamide", "Salicylic Acid", "Retinol", "Phenoxyethanol", "Limonene"];

const worker = await createWorker("eng");
const { data } = await worker.recognize(new URL("../public/samples/label.png", import.meta.url).pathname);
await worker.terminate();

console.log(data.text.trim());
const missing = expected.filter((name) => !data.text.includes(name));
if (missing.length) {
  console.error(`\nOCR missed: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`\nOK: found all ${expected.length} expected ingredient names (confidence ${Math.round(data.confidence)}).`);
