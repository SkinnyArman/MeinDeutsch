import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const sourcePath = resolve(root, "src/contracts/api-types.ts");
const targetPath = resolve(root, "../frontend/src/types/ApiTypes.ts");

const banner = `// This file is generated from backend/src/contracts/api-types.ts\n// Do not edit directly. Run: npm run sync:types (from backend)\n\n`;

const sync = async () => {
  const source = await readFile(sourcePath, "utf8");
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${banner}${source}`, "utf8");
};

await sync();
