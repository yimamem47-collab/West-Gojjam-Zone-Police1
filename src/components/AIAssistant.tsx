import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, MessageSquare, Trash2, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Language, translations } from '../lib/translations';
import { getGeminiResponse, getGeminiResponseStream, getGeminiTTS } from '../services/geminiService';
import { useAppData } from '../hooks/useAppData';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIAssistantProps {
  lang: Language;
  compact?: boolean;
}

export function AIAssistant({ lang, compact = false }: AIAssistantProps) {
  const t = translations[lang];
  const { chatMessages, addChatMessage, updateChatMessage, clearChatHistory, assignments, incidents, reports, zoneReports, user } = useAppData();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // Speech Recognition setup - only once
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  // Update recognition language when lang changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang === 'am' ? 'am-ET' : 'en-US';
    }
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(lang === 'am' ? 'ይቅርታ፣ የእርስዎ ብሮውዘር የድምፅ ትዕዛዝን አይደግፍም።' : 'Sorry, your browser does not support speech recognition.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  };

  const speakText = async (text: string) => {
    // Always prioritize window.speechSynthesis as requested
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!text) return;

    setIsSpeaking(true);
    window.speechSynthesis.cancel();
    
    // Clean text for speech (remove markdown)
    const cleanText = text.replace(/[*#_`~]/g, '').replace(/\[.*?\]\(.*?\)/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find an Amharic voice if language is Amharic
    if (lang === 'am') {
      const voices = window.speechSynthesis.getVoices();
      const amharicVoice = voices.find(v => v.lang.includes('am') || v.lang.includes('ET'));
      if (amharicVoice) {
        utterance.voice = amharicVoice;
      }
      utterance.lang = 'am-ET';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ((window as any)._currentAudioSource) {
        try {
          (window as any)._currentAudioSource.stop();
          (window as any)._currentAudioSource = null;
          if ((window as any)._currentAudioCtx) {
            (window as any)._currentAudioCtx.close();
            (window as any)._currentAudioCtx = null;
          }
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await addChatMessage({
        text: lang === 'am' ? 'የGemini API ቁልፍ (API Key) አልተገኘም። እባክዎ በቅንብሮች (Settings) ውስጥ ቁልፉን ያስገቡ ወይም VITE_GEMINI_API_KEY ን ይፈትሹ።' : "Gemini API key is missing. Please provide VITE_GEMINI_API_KEY in the environment or Settings menu.",
        sender: 'ai'
      });
      return;
    }

    const userMessageText = input;

    await addChatMessage({
      text: userMessageText,
      sender: 'user'
    });

    setInput('');
    setLoading(true);

    try {
      // Create a placeholder for the AI response
      const aiMessageId = await addChatMessage({
        text: '...',
        sender: 'ai'
      });

      if (!aiMessageId) throw new Error("Failed to create AI message");

      const aiResponse = await getGeminiResponseStream(
        userMessageText, 
        chatMessages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })),
        { assignments, incidents, reports, zoneReports, user },
        async (text) => {
          // Update the message in Firestore as it streams
          await updateChatMessage(aiMessageId, text);
        }
      );
      
      // Auto-speak the final response
      speakText(aiResponse);
    } catch (error) {
      console.error('Chat error:', error);
      await addChatMessage({
        text: lang === 'am' ? 'ይቅርታ፣ ምላሽ መስጠት አልቻልኩም። እባክዎ እንደገና ይሞክሩ።' : "Sorry, I couldn't generate a response. Please try again.",
        sender: 'ai'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    await clearChatHistory();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  return (
    <div className={`flex flex-col ${compact ? 'h-[260px] w-full' : 'h-[calc(100vh-12rem)] max-w-4xl mx-auto'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-0.5' : 'mb-6'}`}>
        <div>
          <h1 className={`${compact ? 'text-[11px]' : 'text-3xl'} font-bold tracking-tight flex items-center gap-1`}>
            <Bot className="text-brand-accent" size={compact ? 12 : 32} />
            {lang === 'am' ? 'የምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት' : 'WG Police Digital Assistant'}
          </h1>
          {!compact && (
            <div className="space-y-1 mt-1 font-medium">
              <p className="text-brand-accent text-sm">
                {lang === 'am' ? 'በዋና ሳጅን መንገሻ ይማም አበራ የተገነባ' : 'Built by Chief Sergeant Mengesha Yimam Abera'}
              </p>
              <p className="text-brand-text-secondary text-sm">
                {lang === 'am' ? 'ስለ ኢፌዴሪ ሕገ-መንግሥት፣ የወንጀል ሕግ፣ የትራፊክ ደኅንነት አዋጆች እና ሰብአዊ መብቶች ይጠይቁ።' : 'Ask about the FDRE Constitution, Criminal Law, Traffic Safety, and Human Rights.'}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isSpeaking && (
            <button 
              onClick={() => speakText('')}
              className={`p-0.5 text-brand-accent hover:text-brand-accent/80 transition-colors flex items-center gap-0.5 text-[8px] bg-brand-accent/10 rounded-md`}
            >
              <VolumeX size={10} />
              {!compact && (lang === 'am' ? 'አቁም' : 'Stop')}
            </button>
          )}
          {chatMessages.length > 0 && (
            <button 
              onClick={clearChat}
              className="p-0.5 text-brand-text-secondary hover:text-rose-400 transition-colors flex items-center gap-0.5 text-[8px]"
            >
              <Trash2 size={10} />
              {!compact && (lang === 'am' ? 'አጥፋ' : 'Clear')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className={`flex-1 overflow-y-auto ${compact ? 'p-1' : 'p-3 md:p-4'} space-y-1.5 md:space-y-4 scrollbar-thin scrollbar-thumb-brand-border`}>
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-1 md:space-y-3 opacity-50">
              <div className={`${compact ? 'w-6 h-6' : 'w-12 h-12'} bg-brand-accent/10 rounded-full flex items-center justify-center border border-brand-accent/20`}>
                <MessageSquare size={compact ? 12 : 24} className="text-brand-accent" />
              </div>
              <div>
                <p className={`${compact ? 'text-[10px]' : 'text-lg'} font-medium`}>
                  {lang === 'am' ? 'ውይይት ይጀምሩ' : 'Start a conversation'}
                </p>
                <p className="text-[8px] md:text-sm">
                  {lang === 'am' ? 'ለምሳሌ፡ "ዛሬ የተረኛ ማነው?" ወይም "የተጠርጣሪ መረጃ ፈልግ"' : 'Try: "Who is on duty today?" or "Search suspect info"'}
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-1 md:gap-3 max-w-[95%] md:max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`
                      w-5 h-5 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0
                      ${msg.sender === 'user' ? 'bg-brand-accent text-brand-bg' : 'bg-white/10 text-brand-accent border border-white/10'}
                    `}>
                      {msg.sender === 'user' ? <User size={compact ? 10 : 16} /> : <Bot size={compact ? 10 : 16} />}
                    </div>
                    <div className={`
                      p-1.5 md:p-4 rounded-xl text-[10px] md:text-sm leading-relaxed relative group
                      ${msg.sender === 'user' 
                        ? 'bg-brand-accent text-brand-bg font-medium rounded-tr-none' 
                        : 'bg-white/5 border border-white/10 text-white rounded-tl-none'}
                    `}>
                      <div className="prose prose-invert prose-xs md:prose-sm max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                      
                      {msg.sender === 'ai' && (
                        <button 
                          onClick={() => speakText(msg.text)}
                          className="absolute -right-5 top-0.5 p-0.5 text-brand-text-secondary hover:text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity bg-brand-bg rounded-md border border-brand-border"
                          title={lang === 'am' ? 'ድምፅ ስማ' : 'Listen'}
                        >
                          <Volume2 size={8} />
                        </button>
                      )}

                      <div className={`text-[7px] mt-0.5 opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-1 md:gap-3">
                <div className="w-5 h-5 md:w-8 md:h-8 rounded-lg bg-white/10 text-brand-accent border border-white/10 flex items-center justify-center">
                  <Bot size={compact ? 10 : 16} />
                </div>
                <div className="bg-white/5 border border-white/10 p-1.5 md:p-4 rounded-xl rounded-tl-none">
                  <Loader2 className="animate-spin text-brand-accent" size={10} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={`${compact ? 'p-0.5' : 'p-2 md:p-3'} bg-brand-bg/50 border-t border-brand-border`}>
          <form onSubmit={handleSend} className="relative flex items-center gap-1 md:gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-1 md:p-2.5 rounded-lg transition-all shrink-0 ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'bg-white/5 border border-white/10 text-brand-text-secondary hover:text-brand-accent hover:bg-white/10'
              }`}
              title={lang === 'am' ? 'በድምፅ አስገባ' : 'Voice Input'}
            >
              {isListening ? <MicOff size={12} /> : <Mic size={12} />}
            </button>
            
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? (lang === 'am' ? 'እያዳመጥኩ ነው...' : 'Listening...') : (lang === 'am' ? 'እዚህ ይጻፉ...' : 'Type your message here...')}
                className={`w-full bg-white/5 border border-white/10 rounded-lg ${compact ? 'py-1 pl-1.5 pr-6' : 'py-2.5 pl-4 pr-12'} text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-[10px] md:text-sm`}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`absolute ${compact ? 'right-0.5' : 'right-1.5'} top-1/2 -translate-y-1/2 p-0.5 bg-brand-accent text-brand-bg rounded-md hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
              >
                <Send size={10} />
              </button>
            </div>
          </form>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-[7px] text-brand-text-secondary">
            <Sparkles size={6} className="text-brand-accent" />
            Powered by Gemini AI
          </div>
        </div>
      </div>
    </div>
  );
}
