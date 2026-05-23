import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, ExternalLink, AlertCircle, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Language, translations } from '../lib/translations';

interface QRScannerProps {
  lang: Language;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function QRScanner({ lang, onClose, onScan }: QRScannerProps) {
  const t = translations[lang];
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let mounted = true;
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    const startScanner = async () => {
      if (native) {
        try {
          // Native Capacitor Scanner logic
          const { barcodes } = await BarcodeScanner.scan();
          if (barcodes.length > 0 && barcodes[0].displayValue) {
            onScan(barcodes[0].displayValue);
          }
          onClose(); // Close automatically on success for native
        } catch (err: any) {
          console.error("Native Scanner Error:", err);
          // If native fails or is cancelled, try web as fallback if possible
          if (err.message?.includes('cancelled')) {
            onClose();
          } else {
             startWebScanner();
          }
        }
        return;
      }

      startWebScanner();
    };

    const startWebScanner = async () => {
      try {
        // ✅ HTTPS check (important for camera)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && !native) {
          throw new Error('Camera requires HTTPS');
        }

        // ✅ ask permission
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e) {
          console.warn("Permission direct check failed, attempting scanner anyway", e);
        }

        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            onScan(decodedText);
            html5QrCode.stop().catch(() => {});
          },
          () => {} // ignore scan errors
        );

        if (mounted) setLoading(false);

      } catch (err) {
        console.error("Web Camera Error:", err);
        if (mounted) {
          setPermissionDenied(true);
          setError(
            lang === 'am'
              ? 'ካሜራ አልተፈቀደም ወይም HTTPS ያስፈልጋል!'
              : 'Camera blocked or HTTPS required!'
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan, lang, onClose]);

  const resetScanner = () => {
    window.location.reload();
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md overflow-hidden"
      >

        {/* Header */}
        <div className="p-6 border-b border-brand-border flex justify-between">
          <div className="flex items-center gap-2">
            <Camera className="text-brand-accent" size={20} />
            <h2 className="text-xl font-bold">{t.qrScanner || 'QR Scanner'}</h2>
          </div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6">

          {/* ❌ Permission Error */}
          {permissionDenied ? (
            <div className="text-center">
              <AlertCircle className="text-rose-500 mx-auto mb-4" size={40} />
              <p className="mb-4 text-sm">{error}</p>
              <button onClick={openInNewTab} className="btn-primary w-full">
                <ExternalLink size={16} />
                {lang === 'am' ? 'በአዲስ ታብ ክፈት' : 'Open in New Tab'}
              </button>
            </div>
          ) : (
            <>
              {/* ✅ Loading */}
              {loading && (
                <p className="text-center text-sm mb-4">
                  {lang === 'am' ? 'ካሜራ በመክፈት ላይ...' : 'Starting camera...'}
                </p>
              )}

              {/* ✅ Scanner */}
              <div id="qr-reader" className="rounded-xl overflow-hidden"></div>

              {/* Controls */}
              <div className="mt-6 text-center space-y-3">
                <button onClick={resetScanner} className="btn-secondary">
                  <RefreshCw size={14} />
                  {lang === 'am' ? 'እንደገና ጀምር' : 'Reset'}
                </button>

                <button 
                  onClick={openInNewTab}
                  className="text-xs text-brand-accent underline"
                >
                  {lang === 'am' ? 'በአዲስ ታብ ክፈት' : 'Open in new tab'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}