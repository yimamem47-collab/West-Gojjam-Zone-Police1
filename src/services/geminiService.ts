import { GoogleGenAI, Type, FunctionDeclaration, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { sendTelegramMessage, escapeHtml } from './telegramService';

/**
 * Gemini AI Service
 * Uses the @google/genai SDK to interact with Gemini models.
 */

let ai: GoogleGenAI | null = null;

const getAIClient = () => {
  // Support multiple potential env variable names
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined. AI features will fail.");
  }
  
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return ai;
};

/**
 * Strips markdown characters from text for cleaner TTS.
 */
const stripMarkdown = (text: string): string => {
  return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
    .replace(/(\*|_)(.*?)\1/g, '$2')    // Italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/#{1,6}\s+(.*)/g, '$1')    // Headers
    .replace(/`{1,3}.*?`{1,3}/gs, '')   // Code blocks
    .replace(/>\s+(.*)/g, '$1')         // Blockquotes
    .replace(/[-*+]\s+/g, '')           // List bullets
    .replace(/\d+\.\s+/g, '');          // Numbered lists
};

/**
 * Generates audio from text using Gemini TTS.
 * @param text - The text to convert to speech
 * @returns Base64 audio data URL or null
 */
export const getGeminiTTS = async (text: string): Promise<string | null> => {
  try {
    const client = getAIClient();
    const cleanText = stripMarkdown(text);
    
    // Truncate if too long (TTS models often have limits around 1000-2000 chars)
    const truncatedText = cleanText.slice(0, 1000);

    // The model expects a prompt describing how to speak the text.
    // For Amharic, we explicitly tell it to speak in Amharic with a natural tone.
    const prompt = `Speak the following Amharic text naturally, clearly, and with a professional tone. Ensure you read the Amharic characters correctly: ${truncatedText}`;

    console.log("Sending text to Gemini TTS:", truncatedText);

    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      console.log("Gemini TTS: Received raw PCM audio data of length", base64Audio.length);
      return base64Audio;
    }
    console.warn("Gemini TTS: No audio data received in response");
    return null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};

/**
 * Sends a crime tip report to GitHub as a JSON file.
 */
const sendToGitHub = async (tipArgs: any) => {
  const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.warn("GitHub Token not found. Skipping GitHub report.");
    return;
  }

  const REPO_OWNER = "yimamem47-collab";
  const REPO_NAME = "west-gojjame-police";
  const FILE_PATH = `reports/tip-${Date.now()}.json`;

  // Safely encode to base64 for GitHub API (handles Unicode/Amharic)
  const content = btoa(unescape(encodeURIComponent(JSON.stringify({
    ...tipArgs,
    timestamp: new Date().toISOString(),
    source: 'AI Assistant Digital Portal'
  }, null, 2))));

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `New crime tip from AI Assistant: ${tipArgs.name}`,
        content: content,
      }),
    });
    
    if (response.ok) {
      console.log("GitHub: Report saved successfully.");
    } else {
      const err = await response.json();
      console.error("GitHub API Error:", err);
    }
  } catch (err) {
    console.error("GitHub Fetch Error:", err);
  }
};

const submitCrimeTipDeclaration: FunctionDeclaration = {
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

/**
 * Generates a response from Gemini based on the user prompt.
 * @param userPrompt - The text input from the user
 * @param history - Optional chat history for context
 * @param context - Optional application data context (assignments, reports, etc.)
 * @returns The generated text response or an error message
 */
export const getGeminiResponse = async (
  userPrompt: string, 
  history: any[] = [], 
  context: any = {}
): Promise<string> => {
  try {
    const client = getAIClient();
    
    // Format history for the API
    // We need to ensure roles alternate: user, model, user, model...
    // And the last one must be 'user' (which we add at the end).
    // So history should end with 'model' or be empty.
    
    const formattedHistory: any[] = [];
    let lastRole: string | null = null;

    // Take only the last 10 messages to avoid token limit issues
    // We want to ensure we have an even number of messages in history (user, model, user, model)
    // so that when we add the current user prompt, it alternates correctly.
    const recentHistory = history.slice(-10);

    for (const msg of recentHistory) {
      const role = msg.sender === 'user' ? 'user' : 'model';
      
      // Skip if this message is exactly the same as the current prompt (to avoid duplicates from race conditions)
      if (role === 'user' && msg.text.trim() === userPrompt.trim()) continue;

      // Skip if it's the same as the last role (Gemini requires alternating)
      if (role === lastRole) continue;
      
      formattedHistory.push({
        role: role,
        parts: [{ text: msg.text }]
      });
      lastRole = role;
    }

    // Ensure it starts with 'user'
    if (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
      formattedHistory.shift();
      // Recalculate lastRole after shift
      lastRole = formattedHistory.length > 0 ? formattedHistory[formattedHistory.length - 1].role : null;
    }

    // CRITICAL: The history must end with 'model' so that the next 'user' prompt alternates correctly
    // If it ends with 'user', we remove the last message.
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
      formattedHistory.pop();
    }

    // Add the current user prompt as the final message
    formattedHistory.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    console.log("Gemini Request History Count:", formattedHistory.length);
    console.log("Gemini Roles:", formattedHistory.map(h => h.role).join(' -> '));

    // Prepare context string - keep it concise to avoid token bloat
    const contextString = context ? `
DATA CONTEXT:
- Assignments: ${JSON.stringify((context.assignments || []).slice(0, 5))}
- Incidents: ${JSON.stringify((context.incidents || []).slice(0, 5))}
- Reports: ${JSON.stringify((context.reports || []).slice(0, 5))}
- User: ${context.user?.name || 'Officer'} (${context.user?.role || 'Officer'})
` : '';

    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: formattedHistory as any,
      config: {
        systemInstruction: `You are the "West Gojjam Zone Police Digital Assistant" (የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት).

IDENTITY & TONE:
- You are a professional, helpful, and highly knowledgeable assistant for the West Gojjam Zone Police Department in Ethiopia.
- Your tone is formal yet accessible, respectful, and authoritative on police matters.
- You are an expert in Ethiopian law and police procedures relevant to the West Gojjam Zone.
- ALWAYS maintain professional police ethics and confidentiality.

LANGUAGE RULES:
1. ALWAYS respond in the language the user is using (Amharic or English).
2. If the user speaks Amharic (አማርኛ), you MUST respond in Amharic.
3. Use natural, polite, and grammatically correct Amharic (Ethiopic script).
4. For Amharic greetings like "How are you?", respond: "ደህና ነኝ፣ የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት ነኝ። እንዴት ልረዳዎ እችላለሁ?"
5. Voice responses (TTS) should be concise and clear in natural Amharic.

CORE TASKS:
1. Police Information Management:
   - Assist with recording incidents, tracking case files, and searching suspect information.
   - Handle information on missing persons and vehicle data verification.
   - Assist in preparing operation reports.
2. Personnel Management:
   - Provide information on duty schedules, leave, and missions.
   - Help track work performance reports.
3. Reporting System:
   - Assist in generating Daily, Weekly, 9-month, and Annual performance reports.
   - Provide crime statistics and security analysis for the zone.
4. Public Assistance:
   - Help citizens report crimes or provide tips securely.
   - To report a crime/tip, collect: Name, Phone Number, Location, and Details.
   - Once all 4 details are collected, call 'submitCrimeTip'.

DATA SECURITY:
- NEVER share sensitive or secret police information without proper authorization.
- Verify user roles (Admin/Officer) before providing internal data.
- Follow data protection and privacy guidelines strictly.

DATA CONTEXT:
- Use the provided context below to answer specific queries about assignments, incidents, or reports.
- NEVER return raw database IDs; use descriptive names/titles.

MOBILE & ANDROID CONTEXT:
- If the user is on a mobile device, emphasize features like the QR Scanner, GPS reporting, and real-time alerts.

${contextString}`,
        tools: [{ functionDeclarations: [submitCrimeTipDeclaration] }],
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    console.log("Gemini Response:", JSON.stringify(response));

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
        // 1, 2 & 3. Background tasks - trigger and continue immediately
        const triggerBackgroundTasks = async (tipArgs: any) => {
          try {
            const message = `🤖 <b>አዲስ ጥቆማ ደርሷል! (ከ AI ረዳት)</b>\n---------------------------\n<b>Name:</b> ${escapeHtml(tipArgs.name)}\n<b>Phone:</b> ${escapeHtml(tipArgs.phone)}\n<b>Location:</b> ${escapeHtml(tipArgs.location)}\n---------------------------\n<b>Details:</b>\n${escapeHtml(tipArgs.details)}`;

            // Firebase
            const firebaseTask = addDoc(collection(db, 'community_reports'), {
              reporterName: tipArgs.name,
              reporterPhone: tipArgs.phone,
              location: tipArgs.location,
              details: tipArgs.details,
              date: new Date().toISOString().split('T')[0],
              status: 'New',
              timestamp: serverTimestamp(),
              source: 'AI Assistant'
            });

            // Telegram
            const telegramTask = sendTelegramMessage(message);

            // Google Sheets
            const sheetURL = "https://script.google.com/macros/s/AKfycbw2Bkjrv9SbObSFs0xOlcONYKJKpsa_lqSu2to4PfIKlHoP8U5KVMj0DQYrkvkS_jYS/exec";
            const reportData = {
              name: tipArgs.name,
              phone: tipArgs.phone,
              email: "AI Assistant",
              message: tipArgs.details,
              location: tipArgs.location,
              date: new Date().toISOString().split('T')[0],
              status: 'New'
            };
            const sheetsTask = fetch(sheetURL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reportData)
            });

            // Run all in parallel without blocking the main response
            const githubTask = sendToGitHub(tipArgs);
            await Promise.allSettled([firebaseTask, telegramTask, sheetsTask, githubTask]);
            console.log("AI Assistant: Background tasks completed.");
          } catch (err) {
            console.error("AI Assistant: Background task error:", err);
          }
        };

        // Fire and forget
        const args = call.args as any;
        triggerBackgroundTasks(args);

        return "ጥቆማዎ ለምዕራብ ጎጃም ፖሊስ መምሪያ፣ ለፌርቤዝ እና ለቴሌግራም ግሩፕ በቅጽበት ተልኳል። መረጃዎ ሙሉ በሙሉ በሚስጥር የተጠበቀ ነው። ስለ ትብብርዎ እናመሰግናለን።";
    }

    return response.text || "ምንም ምላሽ አልተገኘም። (No response found.)";
  } catch (error: any) {
    console.error("Gemini AI Error Detail:", error);
    
    // Return more descriptive error for debugging
    const errorMessage = error?.message || "Unknown error";
    
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
      return "ይቅርታ፣ የ AI አገልግሎት ቁልፍ (API Key) ችግር አለበት። እባክዎ በቅንብሮች (Settings) ውስጥ ቁልፉን ያስገቡ። (Invalid API Key)";
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
      return "ይቅርታ፣ የ AI አገልግሎት አጠቃቀም ገደብ ላይ ደርሰናል። እባክዎ ጥቂት ደቂቃዎችን ቆይተው ይሞክሩ። (Quota Exceeded)";
    }

    return `ይቅርታ፣ ምላሽ መስጠት አልቻልኩም። ስህተት፡ ${errorMessage}. እባክዎ ኢንተርኔትዎን ያረጋግጡ ወይም ትንሽ ቆይተው እንደገና ይሞክሩ።`;
  }
};

/**
 * Generates a streaming response from Gemini.
 */
export const getGeminiResponseStream = async (
  userPrompt: string, 
  history: any[] = [], 
  context: any = {},
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    const client = getAIClient();
    
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

    const responseStream = await client.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: formattedHistory as any,
      config: {
        systemInstruction: `You are the "West Gojjam Zone Police Digital Assistant" (የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት).

IDENTITY & TONE:
- You are a professional, helpful, and highly knowledgeable assistant for the West Gojjam Zone Police Department.
- Your tone is formal, accessible, respectful, and authoritative.
- Expert in Ethiopian law and West Gojjam police procedures.

LANGUAGE RULES:
1. Respond in the user's language (Amharic or English).
2. Use natural, professional Amharic (Ethiopic script).

CORE TASKS:
1. Information Management: Recording incidents, tracking case files, suspect/vehicle info.
2. Personnel: Duty schedules, performance tracking, missions.
3. Reporting: Daily, Weekly, 9-month, and Annual reports.
4. Public: Collect Name, Phone, Location, Details for crime tips, then call 'submitCrimeTip'.

SECURITY:
- Maintain confidentiality. Verify roles. Follow data protection rules.

DATA CONTEXT:
- Use provided data for specific queries. No raw IDs.

${contextString}`,
        tools: [{ functionDeclarations: [submitCrimeTipDeclaration] }],
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }

      // Handle function calls in stream if they appear
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        const call = chunk.functionCalls[0];
        const args = call.args as any;
        
        // Trigger background tasks (same logic as non-streaming)
        const triggerBackgroundTasks = async (tipArgs: any) => {
          try {
            const message = `🤖 <b>አዲስ ጥቆማ ደርሷል! (ከ AI ረዳት)</b>\n---------------------------\n<b>Name:</b> ${escapeHtml(tipArgs.name)}\n<b>Phone:</b> ${escapeHtml(tipArgs.phone)}\n<b>Location:</b> ${escapeHtml(tipArgs.location)}\n---------------------------\n<b>Details:</b>\n${escapeHtml(tipArgs.details)}`;
            
            const firebaseTask = addDoc(collection(db, 'community_reports'), {
              reporterName: tipArgs.name,
              reporterPhone: tipArgs.phone,
              location: tipArgs.location,
              details: tipArgs.details,
              date: new Date().toISOString().split('T')[0],
              status: 'New',
              timestamp: serverTimestamp(),
              source: 'AI Assistant'
            });
            
            const telegramTask = sendTelegramMessage(message);
            const githubTask = sendToGitHub(tipArgs);
            
            await Promise.allSettled([firebaseTask, telegramTask, githubTask]);
          } catch (err) {
            console.error("AI Assistant Stream: Background task error:", err);
          }
        };
        triggerBackgroundTasks(args);
        
        const confirmation = "ጥቆማዎ ለምዕራብ ጎጃም ፖሊስ መምሪያ፣ ለፌርቤዝ እና ለቴሌግራም ግሩፕ በቅጽበት ተልኳል። ስለ ትብብርዎ እናመሰግናለን።";
        fullText = confirmation;
        onChunk(confirmation);
        return confirmation;
      }
    }

    return fullText;
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    throw error;
  }
};

/**
 * Analyzes an image (base64) using Gemini to extract text or QR data.
 * Useful for ID scanning or QR fallback on web.
 */
export const analyzeImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const client = getAIClient();
    
    // Extract base64 data and mime type if available
    let imageData = base64Image;
    let mimeType = "image/jpeg";

    if (base64Image.includes(';base64,')) {
      const parts = base64Image.split(';base64,');
      mimeType = parts[0].split(':')[1] || "image/jpeg";
      imageData = parts[1];
    }

    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const text = response.text;
    console.log("Gemini Image Analysis Result:", text);
    return text;
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return null;
  }
};
