import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const openUrl = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const dialPhone = (phone: string) => {
  if (!phone) return;
  const sanitized = phone.replace(/[^\d+]/g, ''); // Keep digits and + sign
  
  if (Capacitor.isNativePlatform()) {
    // In Capacitor, the best way to handle tel links is often through window.open with _system
    window.open(`tel:${sanitized}`, '_system');
  } else {
    // For web, the hidden link approach is standard 
    const link = document.createElement('a');
    link.href = `tel:${sanitized}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const formatFirestoreTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  
  // Handle Firestore Timestamp object
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString();
  }
  
  // Handle JS Date or string
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};
