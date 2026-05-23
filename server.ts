import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const REPO_OWNER = "yimamem47-collab";
const REPO_NAME = "west-gojjame-police";

// Files to sync (expand this list as needed)
const FILES_TO_SYNC = [
  "src/App.tsx",
  "src/firebase.ts",
  "src/main.tsx",
  "src/types.ts",
  "src/constants.ts",
  "src/index.css",
  "index.html",
  "package.json",
  "vite.config.ts",
  "firestore.rules",
  "firebase-blueprint.json",
  "AGENTS.md",
  "server.ts",
  ".env.example",
  
  // Components
  "src/components/AIAssistant.tsx",
  "src/components/AppManual.tsx",
  "src/components/Assignments.tsx",
  "src/components/Auth.tsx",
  "src/components/CitizenReport.tsx",
  "src/components/CommunityReportForm.tsx",
  "src/components/CommunityReports.tsx",
  "src/components/CorruptionReport.tsx",
  "src/components/CrimeMap.tsx",
  "src/components/Dashboard.tsx",
  "src/components/EmergencyContacts.tsx",
  "src/components/ErrorBoundary.tsx",
  "src/components/Home.tsx",
  "src/components/IncidentMap.tsx",
  "src/components/Incidents.tsx",
  "src/components/Layout.tsx",
  "src/components/Officers.tsx",
  "src/components/PoliceIDScanner.tsx",
  "src/components/PoliceServices.tsx",
  "src/components/QRScanner.tsx",
  "src/components/Reports.tsx",
  "src/components/Scanner.tsx",
  "src/components/Settings.tsx",
  "src/components/TrafficSafety.tsx",
  "src/components/ZoneReports.tsx",

  // Hooks & Libs
  "src/hooks/useAppData.ts",
  "src/lib/translations.ts",
  "src/lib/storage.ts",
  "src/lib/utils.ts",

  // Services
  "src/services/diagnostics.ts",
  "src/services/geminiService.ts",
  "src/services/githubFileService.ts",
  "src/services/telegramService.ts",
  
  // Public assets
  "public/police-logo.png",
  "public/logo.png",
  "public/favicon.ico"
];

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "1.0.1", node: process.version });
  });

  // API Route: GitHub Sync - Pushes local files to the GitHub repo
  app.post("/api/github/sync", async (req, res) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: "GitHub token (GITHUB_TOKEN) is missing on the server environment." });
    }

    const results = [];

    for (const filePath of FILES_TO_SYNC) {
      try {
        const absolutePath = path.resolve(process.cwd(), filePath);
        
        // Skip if file doesn't exist
        try {
          await fs.access(absolutePath);
        } catch {
          results.push({ file: filePath, status: "error", message: "File does not exist locally" });
          continue;
        }

        let base64Content;
        const isBinary = filePath.match(/\.(png|jpg|jpeg|ico|gif|pdf)$/i);
        
        if (isBinary) {
          const buffer = await fs.readFile(absolutePath);
          base64Content = buffer.toString("base64");
        } else {
          const content = await fs.readFile(absolutePath, "utf-8");
          base64Content = Buffer.from(content).toString("base64");
        }

        const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
        
        // 1. Get SHA if file exists to enable update
        const getRes = await fetch(getUrl, {
          headers: {
            "Authorization": `token ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "West-Gojjam-Police-Sync"
          }
        });

        let sha;
        if (getRes.ok) {
          const data = await getRes.json();
          sha = data.sha;
        }

        // 2. Push content via PUT
        const putRes = await fetch(getUrl, {
          method: "PUT",
          headers: {
            "Authorization": `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "West-Gojjam-Police-Sync"
          },
          body: JSON.stringify({
            message: `Sync ${filePath} from Digital Management Dashboard`,
            content: base64Content,
            sha
          })
        });

        if (putRes.ok) {
          results.push({ file: filePath, status: "success" });
        } else {
          const err = await putRes.json();
          results.push({ file: filePath, status: "error", message: err.message || "GitHub API Error" });
        }
      } catch (err: any) {
        results.push({ file: filePath, status: "error", message: err.message });
      }
    }

    res.json({ results });
  });

  // API Route: Telegram Proxy
  app.post("/api/telegram", async (req, res) => {
    const { message, html = true } = req.body;
    
    // Use environment variables or hardcoded fallbacks provided by user
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ error: "Telegram configuration (TOKEN or CHAT_ID) is missing on server" });
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    try {
      const telegramResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: html ? "HTML" : undefined
        })
      });

      const data = await telegramResponse.json();
      
      if (!telegramResponse.ok) {
        return res.status(telegramResponse.status).json(data);
      }

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Internal network error proxying Telegram" });
    }
  });

  // Vite/Static setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server v1.0.1 running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error("CRITICAL: Server failed to start:", err);
  process.exit(1);
});

