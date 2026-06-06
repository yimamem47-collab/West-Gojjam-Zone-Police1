import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Client-side Gemini AI Service Proxy.
 * Calls secure, server-side endpoints to keep API keys completely hidden from the browser.
 */

/**
 * Translates/stream response from Gemini based on user prompt.
 */
export const getGeminiResponseStream = async (
  userPrompt: string, 
  history: any[] = [], 
  context: any = {},
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userPrompt, history, context })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to connect to AI server stream.');
    }

    if (!response.body) {
      throw new Error('No stream body returned from AI Server.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(fullText);
    }

    return fullText;
  } catch (error: any) {
    console.error("Client getGeminiResponseStream error:", error);
    const msg = error?.message || "Connection to assistant is offline.";
    throw new Error(msg);
  }
};

/**
 * Helper to get simple non-stream response from backend
 */
export const getGeminiResponse = async (
  userPrompt: string, 
  history: any[] = [], 
  context: any = {}
): Promise<string> => {
  try {
    let fullText = "";
    await getGeminiResponseStream(userPrompt, history, context, (text) => {
      fullText = text;
    });
    return fullText;
  } catch (error: any) {
    console.error("Client getGeminiResponse error:", error);
    return `ይቅርታ፣ ምላሽ መስጠት አልቻልኩም። ስህተት፡ ${error?.message || "Unknown client-side error"}`;
  }
};

/**
 * Analyzes an image (base64) using Gemini to extract text or scanned data.
 */
export const analyzeImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/gemini/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base64Image, prompt })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to analyze image.');
    }

    const data = await response.json();
    return data.text || null;
  } catch (error) {
    console.error("Client analyzeImage error:", error);
    return null;
  }
};

/**
 * Text-to-Speech fallback
 */
export const getGeminiTTS = async (text: string): Promise<string | null> => {
  return null;
};
