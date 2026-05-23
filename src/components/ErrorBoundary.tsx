import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
  lang: 'en' | 'am';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isAm = this.props.lang === 'am';
      let errorMessage = this.state.error?.message || '';
      let isFirestoreError = false;
      let firestoreInfo = null;

      try {
        if (errorMessage.startsWith('{')) {
          firestoreInfo = JSON.parse(errorMessage);
          isFirestoreError = true;
        }
      } catch (e) {
        // Not a JSON error
      }

      const isNetworkError = errorMessage.includes('offline') || 
                             errorMessage.includes('Could not reach Cloud Firestore') ||
                             errorMessage.includes('network') ||
                             errorMessage.includes('Internet connection');

      return (
        <div className="min-h-screen bg-[#002B5B] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${isNetworkError ? 'bg-amber-500/20 border-amber-500/30' : 'bg-rose-500/20 border-rose-500/30'}`}>
              <AlertCircle size={40} className={isNetworkError ? 'text-amber-400' : 'text-rose-400'} />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-4">
              {isNetworkError 
                ? (isAm ? 'የግንኙነት ችግር ተከስቷል' : 'Connection Problem')
                : (isAm ? 'ይቅርታ! ስህተት ተከስቷል።' : 'Oops! Something went wrong.')}
            </h1>
            
            <div className="bg-black/20 rounded-xl p-4 mb-8 text-left">
              <p className="text-white/80 text-sm mb-2">
                {isNetworkError 
                  ? (isAm ? 'ዳታቤዙን ማግኘት አልተቻለም። እባክዎ ኢንተርኔትዎን ያረጋግጡ ወይም Adblocker ካለዎት ያጥፉት።' : 'Could not reach the database. Please check your internet connection or disable any Adblockers (like Brave Shields or uBlock Origin).')
                  : (isAm ? 'የተከሰተው ስህተት ዝርዝር፦' : 'Error details:')}
              </p>
              <p className="text-rose-200 text-xs font-mono break-all opacity-60">
                {isFirestoreError 
                  ? (isAm ? `የዳታቤዝ ስህተት (${firestoreInfo.operationType}): ${firestoreInfo.error}` : `Database Error (${firestoreInfo.operationType}): ${firestoreInfo.error}`)
                  : errorMessage || (isAm ? 'ያልታወቀ ስህተት ተከስቷል።' : 'An unexpected error occurred.')}
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-[#FFD700] text-[#002B5B] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#FFD700]/90 transition-all"
              >
                <RefreshCcw size={20} />
                {isAm ? 'እንደገና ይሞክሩ' : 'Try Again'}
              </button>
              
              <button 
                onClick={this.handleReset}
                className="w-full bg-white/10 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all border border-white/10"
              >
                <Home size={20} />
                {isAm ? 'ወደ መጀመሪያ ገጽ' : 'Go to Home'}
              </button>
            </div>
            
            <p className="mt-8 text-white/40 text-xs">
              {isAm ? 'ችግሩ ከቀጠለ እባክዎ አስተዳዳሪውን ያነጋግሩ።' : 'If the problem persists, please contact support.'}
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
