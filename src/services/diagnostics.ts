import { sendTelegramMessage } from './telegramService';
import { db } from '../firebase';
import { getDocFromServer, doc } from 'firebase/firestore';

export interface DiagnosticResult {
  service: 'Firebase' | 'Telegram' | 'GoogleSheets';
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: string;
}

/**
 * Tests connection to Firestore by attempting to read a document from the server.
 */
export async function testFirebaseConnection(): Promise<DiagnosticResult> {
  try {
    console.log('Diagnostic: Testing Firebase connection...');
    // Try to reach the server directly to bypass cache
    // We use a doc that likely doesn't exist, but the attempt itself verifies connectivity
    await getDocFromServer(doc(db, '_system_check_', 'connectivity'));
    
    return {
      service: 'Firebase',
      status: 'success',
      message: 'Firestore is reachable and responding correctly.'
    };
  } catch (error: any) {
    console.error('Firebase Diagnostic Error:', error);
    
    if (error.message?.includes('client is offline')) {
      return {
        service: 'Firebase',
        status: 'error',
        message: 'The client is offline. Check your internet connection.',
        details: error.message
      };
    }
    
    // Permission denied still means we reached the server
    if (error.code === 'permission-denied') {
      return {
        service: 'Firebase',
        status: 'success',
        message: 'Firestore reached (Permission Denied for probe document is expected).'
      };
    }

    return {
      service: 'Firebase',
      status: 'error',
      message: 'Failed to connect to Firestore backend.',
      details: error.message || String(error)
    };
  }
}

/**
 * Tests connection to Telegram by sending a diagnostic message via the server proxy.
 */
export async function testTelegramConnection(): Promise<DiagnosticResult> {
  try {
    console.log('Diagnostic: Testing Telegram connection...');
    const success = await sendTelegramMessage('<b>System Diagnostic</b>\nConnection test initiated from the application settings.');
    
    if (success) {
      return {
        service: 'Telegram',
        status: 'success',
        message: 'Telegram Bot is active and message delivered via server proxy.'
      };
    } else {
      return {
        service: 'Telegram',
        status: 'error',
        message: 'Telegram Bot failed to deliver the message. Check BOT_TOKEN and CHAT_ID.'
      };
    }
  } catch (error: any) {
    console.error('Telegram Diagnostic Error:', error);
    return {
      service: 'Telegram',
      status: 'error',
      message: 'Network error reaching Telegram API proxy.',
      details: error.message || String(error)
    };
  }
}

/**
 * Tests connection to Google Sheets by sending a probe POST request.
 */
export async function testGoogleSheetsConnection(): Promise<DiagnosticResult> {
  const sheetURL = "https://script.google.com/macros/s/AKfycbw2Bkjrv9SbObSFs0xOlcONYKJKpsa_lqSu2to4PfIKlHoP8U5KVMj0DQYrkvkS_jYS/exec";
  
  try {
    console.log('Diagnostic: Testing Google Sheets connection...');
    const response = await fetch(sheetURL, {
      method: 'POST',
      mode: 'no-cors', // Apps Script web app redirect might cause CORS issues on local dev
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'System Diagnostic',
        phone: '0000000000',
        email: 'diagnostic@system.com',
        message: 'Connectivity probe from West Gojjam Police App.',
        location: 'Diagnostic Tool',
        date: new Date().toISOString(),
        status: 'Diagnostic'
      })
    });
    
    // With no-cors, we can't see the response status/body, but if fetch doesn't throw, 
    // it means the browser was able to dispatch the request to Google's servers.
    return {
      service: 'GoogleSheets',
      status: 'success',
      message: 'Google Sheets request dispatched (Probe successful).'
    };
  } catch (error: any) {
    console.error('Google Sheets Diagnostic Error:', error);
    return {
      service: 'GoogleSheets',
      status: 'error',
      message: 'Failed to reach Google Sheets deployment.',
      details: error.message || String(error)
    };
  }
}
