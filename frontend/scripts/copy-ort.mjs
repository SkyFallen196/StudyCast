// Копирует среду выполнения onnxruntime из пакета transformers в public/ort/,
// чтобы распознавание не загружало код с внешнего CDN (jsdelivr). Запускается перед dev и build.
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const from = new URL('../node_modules/@huggingface/transformers/dist/', import.meta.url);
const to = new URL('../public/ort/', import.meta.url);
const files = ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'];

await mkdir(to, { recursive: true });
for (const file of files) {
  await copyFile(new URL(file, from), new URL(file, to));
}
console.log(`onnxruntime -> ${fileURLToPath(to)}`);
