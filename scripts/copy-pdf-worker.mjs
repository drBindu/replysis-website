import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendDirectory = resolve(scriptDirectory, "..");
const source = resolve(frontendDirectory, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");
const destination = resolve(frontendDirectory, "public/pdf.worker.min.mjs");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
