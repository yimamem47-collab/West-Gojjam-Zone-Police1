import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Language, translations } from '../lib/translations';

interface VoiceRecorderProps {
  lang: Language;
  onRecordingComplete: (blob: Blob) => void;
  onDelete: () => void;
  maxDuration?: number;
}

export function VoiceRecorder({ lang, onRecordingComplete, onDelete, maxDuration = 60 }: VoiceRecorderProps) {
  const t = translations[lang];
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording, maxDuration]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setDuration(0);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob);
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert(lang === 'am' ? 'ማይክሮፎን ማግኘት አልተቻለም። እባክዎ ፈቃድ መስጠትዎን ያረጋግጡ።' : 'Could not access microphone. Please ensure permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDelete = () => {
    setAudioUrl(null);
    setDuration(0);
    onDelete();
  };

  return (
    <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <label className="block text-sm font-medium text-brand-text-secondary">
          {t.recordAudio || 'Voice Note'}
        </label>
        {isRecording && (
          <span className="text-xs font-mono text-rose-500 animate-pulse font-bold">
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} / {Math.floor(maxDuration / 60)}:{(maxDuration % 60).toString().padStart(2, '0')}
          </span>
        )}
        {!isRecording && audioUrl && (
          <span className="text-xs font-mono text-emerald-500 font-bold">
            {t.recordingReady || 'Recording Ready'}
          </span>
        )}
      </div>

      {!isRecording && !audioUrl ? (
        <button
          type="button"
          onClick={startRecording}
          className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all group"
        >
          <div className="p-2 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-all">
            <Mic size={20} />
          </div>
          <span className="font-bold">{t.recordAudio || 'Start Voice Note'} (Max {maxDuration}s)</span>
        </button>
      ) : isRecording ? (
        <div className="space-y-4">
          <div className="flex justify-center items-center gap-1 h-8">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                className="w-1 bg-rose-500 rounded-full"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-500/20 transition-all"
          >
            <Square size={20} fill="currentColor" />
            <span className="font-bold">{t.stopRecording || 'Stop & Save'}</span>
          </button>
        </div>
      ) : (
        <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full">
              <Volume2 size={20} />
            </div>
            <audio src={audioUrl!} controls className="flex-1 h-10 custom-audio-player" />
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all"
              title={t.delete || 'Delete'}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}
      
      {audioUrl && (
        <p className="mt-2 text-[10px] text-brand-text-secondary text-center italic">
          {lang === 'am' ? 'የተቀዳው ድምፅ በሪፖርቱ ውስጥ ይካተታል።' : 'Recorded audio will be attached to the report.'}
        </p>
      )}
    </div>
  );
}
