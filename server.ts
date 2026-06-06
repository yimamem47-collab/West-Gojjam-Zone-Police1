import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

dotenv.config();

const __filename = typeof import.meta !== "undefined" && import.meta.url
  ? fileURLToPath(import.meta.url)
  : "";
const __dirname = __filename ? path.dirname(__filename) : "";

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
  app.use(express.json({ limit: '20mb' })); // support larger base64 image scanning payloads

  // Helper for escaping HTML strings
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper for sending Telegram messages
  async function sendServerTelegramMessage(message: string) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (!BOT_TOKEN || !CHAT_ID) {
      console.warn("Server Telegram config missing.");
      return;
    }
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "HTML"
        })
      });
      if (!res.ok) {
        console.error("Telegram API response error:", await res.text());
      }
    } catch (err) {
      console.error("Telegram API fetch error:", err);
    }
  }

  // Handle server-side submitCrimeTip function call
  async function handleServerSubmitCrimeTip(args: any) {
    try {
      console.log("Server submitCrimeTip triggered with args:", args);
      const escapedName = escapeHtml(args.name || "");
      const escapedPhone = escapeHtml(args.phone || "");
      const escapedLocation = escapeHtml(args.location || "");
      const escapedDetails = escapeHtml(args.details || "");

      const message = `🤖 <b>አዲስ ጥቆማ ደርሷል! (ከ AI ረዳት)</b>\n---------------------------\n<b>Name:</b> ${escapedName}\n<b>Phone:</b> ${escapedPhone}\n<b>Location:</b> ${escapedLocation}\n---------------------------\n<b>Details:</b>\n${escapedDetails}`;

      // 1. Firebase Write (Firestore)
      try {
        const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
        const firebaseConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));
        const firebaseApp = initializeApp(firebaseConfig);
        const db = firebaseConfig.firestoreDatabaseId 
          ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
          : getFirestore(firebaseApp);
        await addDoc(collection(db, 'community_reports'), {
          reporterName: args.name,
          reporterPhone: args.phone,
          location: args.location,
          details: args.details,
          date: new Date().toISOString().split('T')[0],
          status: 'New',
          timestamp: serverTimestamp(),
          source: 'AI Assistant'
        });
        console.log("Server submitCrimeTip: Firestore write completed.");
      } catch (e) {
        console.error("Server submitCrimeTip: Firestore write failed:", e);
      }

      // 2. Telegram Send
      await sendServerTelegramMessage(message);

      // 3. Google Sheets
      const sheetURL = "https://script.google.com/macros/s/AKfycbw2Bkjrv9SbObSFs0xOlcONYKJKpsa_lqSu2to4PfIKlHoP8U5KVMj0DQYrkvkS_jYS/exec";
      await fetch(sheetURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: args.name,
          phone: args.phone,
          email: "AI Assistant",
          message: args.details,
          location: args.location,
          date: new Date().toISOString().split('T')[0],
          status: 'New'
        })
      }).catch(e => console.error("Sheets submit failed:", e));

      // 4. GitHub Backup Upload
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
      if (GITHUB_TOKEN) {
        const FILE_PATH = `reports/tip-${Date.now()}.json`;
        const contentObj = {
          ...args,
          timestamp: new Date().toISOString(),
          source: 'AI Assistant Digital Portal'
        };
        const base64Content = Buffer.from(JSON.stringify(contentObj, null, 2)).toString("base64");
        const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        await fetch(putUrl, {
          method: "PUT",
          headers: {
            "Authorization": `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "West-Gojjam-Police-Sync"
          },
          body: JSON.stringify({
            message: `New crime tip from AI Assistant: ${args.name}`,
            content: base64Content
          })
        }).catch(e => console.error("GitHub upload failed:", e));
      }
    } catch (err) {
      console.error("Server submitCrimeTip function error:", err);
    }
  }

  // Declarations for Gemini Tool Calls
  const submitCrimeTipDeclaration = {
    name: "submitCrimeTip",
    description: "Submit a crime tip or report from a citizen to the police department. Extracts name, phone, location, and details.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The name of the person reporting the tip." },
        phone: { type: Type.STRING, description: "The phone number of the person reporting." },
        location: { type: Type.STRING, description: "The location of the incident." },
        details: { type: Type.STRING, description: "The full details of the crime or tip." },
      },
      required: ["name", "phone", "location", "details"],
    },
  };

  // API Route: Gemini Stream
  app.post("/api/gemini/stream", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY dashboard secret or env variable is missing on Cloud Run." });
    }

    const { userPrompt, history = [], context = {} } = req.body;

    try {
      const aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Accel-Buffering', 'no');

      // Prep history sequence for Gemini connect (user, model alternating)
      const formattedHistory: any[] = [];
      let lastRole: string | null = null;
      const recentHistory = history.slice(-10);

      for (const msg of recentHistory) {
        const role = msg.sender === 'user' ? 'user' : 'model';
        if (role === 'user' && msg.text.trim() === userPrompt.trim()) continue;
        if (role === lastRole) continue;

        formattedHistory.push({
          role: role,
          parts: [{ text: msg.text }]
        });
        lastRole = role;
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
        formattedHistory.shift();
      }

      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
        formattedHistory.pop();
      }

      formattedHistory.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });

      const contextString = context ? `
DATA CONTEXT:
- Assignments: ${JSON.stringify((context.assignments || []).slice(0, 5))}
- Incidents: ${JSON.stringify((context.incidents || []).slice(0, 5))}
- Reports: ${JSON.stringify((context.reports || []).slice(0, 5))}
- User: ${context.user?.name || 'Officer'} (${context.user?.role || 'Officer'})
` : '';

      const systemInstruction = `## ════════════════════════════════════════
## WG POLICE DIGITAL ASSISTANT — SYSTEM PROMPT
## Version: 1.0 | Language: Amharic + English
## ════════════════════════════════════════

## IDENTITY & DEVELOPER
You are the WG Police Digital Assistant (የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት), an official AI-powered assistant for the West Gojam (WG) Zone Police Commission in Ethiopia. You operate professionally, securely, and responsibly. You communicate primarily in Amharic but can also respond in English when asked.
- You were developed by Chief Sergeant Mengesha Yimam Abera (ዋና ሳጅን መንገሻ ይማም አበራ).

## CORE MISSION
- Provide fast, accurate, and helpful responses to all public and internal inquiries
- Relay submitted information securely to authorized channels (Telegram Bot + Firebase)
- Maintain strict confidentiality of all user-submitted data
- Assist citizens and officers with police-related services, procedures, and guidance

## BEHAVIOR & TONE
- Always be respectful, professional, and clear
- Use formal Amharic (አማርኛ) as the default language
- After receiving ANY crime report or complaint/tip from the user, always say:
  "ስለሰጡን ጠቃሚ መረጃ እናመሰግናለን። ጉዳዩ ወዲያውኑ ለሚመለከተው አካል ይተላለፋል።"
- Respond to EVERY question — never leave a question unanswered
- If a question is outside your scope, politely explain and direct to the right channel

## DATA HANDLING & SECURITY
- All information collected from users MUST be:
  ✓ Logged securely to Firebase Firestore (real-time database)
  ✓ Forwarded to the designated Telegram Bot channel
  ✓ Timestamped with submission date and time
  ✓ Tagged with category: [report / complaint / inquiry / emergency / feedback]
- NEVER reveal, share, or expose personal data of users to other users
- NEVER store sensitive data in plain conversation logs
- Remind users that their information is kept strictly confidential
- For emergency reports, add priority flag: 🚨 URGENT

## DATA FORMAT TO SEND (Firebase + Telegram)
When user submits information, structure it as:
{
  "timestamp": "[ISO 8601 format]",
  "category": "[report|complaint|inquiry|emergency|feedback]",
  "user_input": "[sanitized user message]",
  "language": "[Amharic|English|Mixed]",
  "priority": "[normal|urgent]",
  "status": "pending_review",
  "source": "WG_Police_Digital_Assistant"
}

## CAPABILITIES — ዋና አገልግሎቶች
1. 📋 ቅሬታ መቀበል — Receive and log public complaints
2. 🚨 ድንገተኛ ሪፖርት — Accept emergency incident reports (high priority)
3. ❓ ጥያቄ መመለስ — Answer questions about police procedures, rights, documentation
4. 📞 አድራሻ / ማጣቀሻ — Provide contact info and referrals for police stations
5. 📝 ማመልከቻ መርዳት — Guide users on how to file applications or reports
6. 🔍 ጉዳይ ክትትል — Help users understand how to follow up on their cases
7. 📢 ማስታወቂያ — Share official announcements and public safety information
8. 💡 ምክር — Provide general legal awareness and safety advice

## CONVERSATION FLOW
Step 1 → Greet the user warmly and ask how you can help
Step 2 → Identify the type of request (complaint / emergency / inquiry / feedback)
Step 3 → Collect necessary details (who, what, where, when)
Step 4 → Confirm receipt: thank the user in Amharic
Step 5 → Relay data to Telegram Bot + Firebase
Step 6 → Provide next steps or estimated follow-up time

## GREETING MESSAGE (on start)
"እንኳን ደህና መጡ! እኔ የ ምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። ቅሬታ፣ ሪፖርት፣ ወይም ማናቸውንም ጥያቄ ለማቅረብ ዝግጁ ነኝ። እንዴት ልረዳዎ?"

## EMERGENCY PROTOCOL
If keywords detected: [ድንገተኛ, ዘረፋ, ጥቃት, አደጋ, ሞት, ስርቆት, emergency, urgent, attack, robbery, accident]
→ Immediately flag as URGENT
→ Send priority alert to Telegram Bot
→ Respond: "ሁኔታው ለአስቸኳይ ምላሽ ቡድን ወዲያውኑ ተልኳል። እባክዎ ደህንነቱ በተጠበቀ ቦታ ይቆዩ።"
→ Provide emergency contact numbers

## CONFIDENTIALITY STATEMENT
When user asks about privacy:
"የሚሰጡን ሁሉም መረጃዎች በጥብቅ ሚስጥራዊ ሆነው ይጠበቃሉ። ለሌሎች አካላት አይጋሩም። ለፖሊስ ምርመራ ብቻ ያገለግላሉ።"

## LIMITATIONS
- Do NOT give legal verdicts or court decisions
- Do NOT promise specific outcomes
- Do NOT provide information that could compromise ongoing investigations
- Always recommend consulting a licensed lawyer for complex legal matters

## DATA CONTEXT:
${contextString}

## FUNCTION CALLING:
- To report a crime, complaint, or tip, you MUST collect: Name, Phone Number, Location, and Details. Once all 4 pieces of information are collected, call the 'submitCrimeTip' function.
- When 'submitCrimeTip' is called, inform the user: "ጥቆማዎ ለምዕራብ ጎጃም ፖሊስ መምሪያ፣ ለፌርቤዝ እና ለቴሌግራም ግሩፕ በቅጽበት ተልኳል። ስለ ትብብርዎ እናመሰግናለን።"

## CLOSING / FOLLOW-UP
After every interaction end with:
"ለዚህ አገልግሎት ስለተጠቀሙ እናመሰግናለን። ሌላ ጥያቄ ካለዎ ሁሌም እዚህ ነኝ። የምዕራብ ጎጃም ዞን ፖሊስ ሁሌም ለዜጎች ደህንነት ቆሟል! 🇪🇹"`;

      const responseStream = await aiClient.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: formattedHistory as any,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [submitCrimeTipDeclaration] }],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(text);
        }

        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          const call = chunk.functionCalls[0];
          if (call.name === "submitCrimeTip") {
            const args = call.args as any;
            await handleServerSubmitCrimeTip(args);
            res.write("ጥቆማዎ ለምዕራብ ጎጃም ፖሊስ መምሪያ፣ ለፌርቤዝ እና ለቴሌግራም ግሩፕ በቅጽበት ተልኳል። ስለ ትብብርዎ እናመሰግናለን።");
            break;
          }
        }
      }

      res.end();
    } catch (error: any) {
      console.error("Server Gemini Stream Error:", error);
      res.write(`ይቅርታ፣ ምላሽ መስጠት አልቻልኩም። ስህተት፡ ${error.message || "Unknown server-side error"}`);
      res.end();
    }
  });

  // API Route: Analyze Image (Server-Side)
  app.post("/api/gemini/analyze-image", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not defined on the server." });
    }

    const { base64Image, prompt } = req.body;

    try {
      const aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      let imageData = base64Image;
      let mimeType = "image/jpeg";

      if (base64Image.includes(';base64,')) {
        const parts = base64Image.split(';base64,');
        mimeType = parts[0].split(':')[1] || "image/jpeg";
        imageData = parts[1];
      }

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageData,
                mimeType: mimeType
              }
            }
          ]
        }]
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Server analyze-image error:", error);
      res.status(500).json({ error: error.message || "Gemini image analysis failed." });
    }
  });

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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server v1.0.1 running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Keep a global reference to the server instance to avoid "ERR_SERVER_ALREADY_LISTEN"
  (global as any).__serverInstance = server;
}

async function run() {
  if ((global as any).__serverInstance) {
    console.log("Existing server instance found in memory. Closing it before restarting...");
    try {
      await new Promise<void>((resolve, reject) => {
        (global as any).__serverInstance.close((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("Successfully closed existing server.");
    } catch (e) {
      console.error("Error closing existing server instance:", e);
    }
  }

  await startServer();
}

run().catch((err) => {
  console.error("CRITICAL: Server failed to start:", err);
  process.exit(1);
});

