import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (fs.existsSync(publicDir)) {
  try {
    fs.cpSync(publicDir, distDir, { recursive: true, force: true });
    console.log('Successfully synced public directory to dist/.');
  } catch (cpErr) {
    const files = fs.readdirSync(publicDir);
    for (const file of files) {
      const src = path.join(publicDir, file);
      const dest = path.join(distDir, file);
      try {
        const stat = fs.lstatSync(src);
        if (stat.isDirectory()) {
          fs.cpSync(src, dest, { recursive: true, force: true });
          console.log(`Copied directory ${file}/ to dist/ successfully.`);
        } else if (stat.isFile()) {
          fs.copyFileSync(src, dest);
          console.log(`Copied ${file} to dist/ successfully.`);
        }
      } catch (err) {
        console.warn(`Guarded warning copying ${file}: ${err.message}`);
      }
    }
  }
}
