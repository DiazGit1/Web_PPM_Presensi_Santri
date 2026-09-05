import fs from 'fs';
import path from 'path';

const SRC_DIR = '../components';
const APP_DIR = '../app';
const DEST_DIR = './src/components';
const DEST_PAGES_DIR = './src/pages';

function migrateFile(filePath, destPath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove "use client" and "use server"
    content = content.replace(/['"]use client['"];?\n?/g, '');
    content = content.replace(/['"]use server['"];?\n?/g, '');

    // Replace Next.js Link
    content = content.replace(/import\s+{([^}]*?)}?\s+from\s+['"]next\/link['"];?/g, "import {$1} from 'react-router-dom';");
    content = content.replace(/<Link([^>]*?)href=/g, '<Link$1to=');

    // Replace next/navigation useRouter
    content = content.replace(/import\s+{([^}]*?useRouter[^}]*?)}?\s+from\s+['"]next\/navigation['"];?/g, "import { useNavigate } from 'react-router-dom';");
    content = content.replace(/const\s+router\s*=\s*useRouter\(\)/g, "const navigate = useNavigate()");
    content = content.replace(/router\.push\(/g, 'navigate(');
    content = content.replace(/router\.refresh\(\)/g, 'window.location.reload()');
    content = content.replace(/router\.replace\(/g, 'navigate(');

    // Replace next/navigation useSearchParams
    content = content.replace(/import\s+{([^}]*?useSearchParams[^}]*?)}?\s+from\s+['"]next\/navigation['"];?/g, "import { useSearchParams } from 'react-router-dom';");
    
    // Replace API routes and Server Actions with Axios
    content = content.replace(/@\/lib\/actions/g, '@/lib/api');
    
    // Basic formatting fixes
    content = content.trim() + '\n';

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(destPath, content);
}

function processDirectory(src, dest) {
    if (!fs.existsSync(src)) return;
    const items = fs.readdirSync(src);
    for (const item of items) {
        const fullPath = path.join(src, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath, path.join(dest, item));
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
            migrateFile(fullPath, path.join(dest, item));
        }
    }
}

// 1. Migrate Components
processDirectory(SRC_DIR, DEST_DIR);
// 2. Migrate Pages (app directory)
processDirectory(APP_DIR, DEST_PAGES_DIR);

console.log("Migration complete.");
