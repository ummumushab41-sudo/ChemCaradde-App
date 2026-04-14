/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, User, Heart, Sparkles, RefreshCcw, Mic, Volume2, BookOpen, Info, Trash2, Camera, Bell, BellOff } from 'lucide-react';
import { ai, SYSTEM_INSTRUCTION } from './lib/gemini';
import confetti from 'canvas-confetti';
import { LewisCanvas } from './components/LewisCanvas';
import { CameraCapture } from './components/CameraCapture';

import Markdown from 'react-markdown';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chemcaradde_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLewisCanvas, setShowLewisCanvas] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'materi' | 'hots' | 'scan'>('chat');
  const [expandedMateri, setExpandedMateri] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(() => {
    const saved = localStorage.getItem('chemcaradde_progress');
    return saved ? parseFloat(saved) : 0;
  });
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('chemcaradde_notifications');
    return saved === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('chemcaradde_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('chemcaradde_progress', progress.toString());
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('chemcaradde_notifications', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  // Initial Greeting & Notifications
  useEffect(() => {
    if (messages.length === 0) {
      handleInitialGreeting();
    }
    
    // Check notification permission on mount
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && notificationsEnabled) {
        setNotificationsEnabled(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log("Visibility changed:", document.visibilityState, "Progress:", progress, "Enabled:", notificationsEnabled);
      if (document.visibilityState === 'hidden' && progress < 100 && notificationsEnabled) {
        // Schedule a reminder if user leaves and progress is incomplete
        const reminderId = setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification("Ayo Belajar Lagi, Nak!", {
              body: `Ibu perhatikan progres belajarmu baru ${progress.toFixed(1)}%. Mari kita selesaikan hari ini ya!`,
              icon: "https://picsum.photos/seed/chemistry/128/128"
            });
          }
        }, 60000); // Remind after 1 minute for faster feedback during testing
        
        (window as any)._reminderTimeout = reminderId;
      } else if (document.visibilityState === 'visible') {
        if ((window as any)._reminderTimeout) {
          clearTimeout((window as any)._reminderTimeout);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [progress, notificationsEnabled]);

  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Maaf Nak, browsermu tidak mendukung fitur notifikasi.");
      return;
    }

    try {
      if (Notification.permission === "granted") {
        setNotificationsEnabled(!notificationsEnabled);
      } else {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === "granted");
        if (permission === "granted") {
          new Notification("Notifikasi Aktif!", {
            body: "Ibu akan mengingatkanmu jika kamu lupa melanjutkan belajar.",
            icon: "https://picsum.photos/seed/chemistry/128/128"
          });
        } else {
          alert("Aduh Nak, sepertinya izin notifikasi ditolak. Tolong aktifkan di pengaturan browser ya.");
        }
      }
    } catch (err) {
      console.error("Notification error:", err);
      alert("Maaf Nak, ada kendala teknis saat mengaktifkan notifikasi.");
    }
  };

  const testNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("Tes Berhasil!", {
        body: "Ini adalah contoh pengingat dari Ibu. Semangat belajarnya ya Nak!",
        icon: "https://picsum.photos/seed/chemistry/128/128"
      });
    } else {
      toggleNotifications();
    }
  };

  useEffect(() => {
    scrollToBottom();
    // Simple progress detection based on AI responses
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      const text = lastMessage.content.toLowerCase();
      if (text.includes("progres: 14%") || text.includes("14%")) setProgress(14);
      if (text.includes("progres: 28%") || text.includes("28%")) setProgress(28);
      if (text.includes("progres: 42%") || text.includes("42%")) setProgress(42);
      if (text.includes("progres: 56%") || text.includes("56%")) setProgress(56);
      if (text.includes("progres: 70%") || text.includes("70%")) setProgress(70);
      if (text.includes("progres: 84%") || text.includes("84%")) setProgress(84);
      if (text.includes("progres: 100%") || text.includes("100%")) setProgress(100);
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInitialGreeting = async () => {
    setIsLoading(true);
    try {
      const result = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "Mulai aplikasi dengan menyapa sesuai [PROSEDUR IDENTITAS]." }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
      
      let assistantText = "";
      const assistantMessageId = Date.now().toString();
      setMessages([{ id: assistantMessageId, role: 'assistant', content: "" }]);

      for await (const chunk of result) {
        const chunkText = chunk.text;
        assistantText += chunkText;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId ? { ...msg, content: assistantText } : msg
        ));
      }
      
      if (isAutoPlay) {
        handleListen(assistantText);
      }
    } catch (error: any) {
      console.error("Initial Greeting Error:", error);
      let errorMessage = "Maaf Nak, sepertinya Ibu sedang ada kendala teknis. Bisa kita coba lagi?";
      
      const errorString = JSON.stringify(error).toUpperCase();
      if (errorString.includes("429") || errorString.includes("QUOTA") || errorString.includes("EXHAUSTED") || error?.status === 429) {
        errorMessage = "Aduh Nak, sepertinya Ibu sedang sangat sibuk melayani banyak siswa (Quota Terlampaui). Tunggu sebentar ya, nanti coba sapa Ibu lagi.";
      }
      
      setMessages([{ id: Date.now().toString(), role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const history = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const currentParts: any[] = [{ text: input || "Lihat gambar ini, Ibu." }];
      if (userMessage.image) {
        currentParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: userMessage.image.split(',')[1],
          },
        });
      }

      const result = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [
          ...history, 
          { 
            role: "user", 
            parts: currentParts 
          }
        ],
        config: {
          systemInstruction: `${SYSTEM_INSTRUCTION}\n\nKONTEKS SAAT INI:\n- Progres Siswa: ${progress.toFixed(1)}%\n- Jika progres < 100%, bimbing ke TP berikutnya.\n- Jika progres 100%, berikan Report Card.`,
        },
      });

      let assistantText = "";
      const assistantMessageId = (Date.now() + 1).toString();
      
      // Add empty assistant message first
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: "" }]);

      for await (const chunk of result) {
        const chunkText = chunk.text;
        assistantText += chunkText;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId ? { ...msg, content: assistantText } : msg
        ));
      }
      
      if (isAutoPlay) {
        handleListen(assistantText);
      }

      // Trigger confetti if certain keywords are found (success)
      const lowerText = assistantText.toLowerCase();
      if (lowerText.includes("hebat") || lowerText.includes("benar sekali") || lowerText.includes("pintar")) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#5a5a40', '#8a8a60', '#d4d4c0']
        });
      }
    } catch (error: any) {
      console.error("Handle Send Error:", error);
      let errorMessage = "Aduh, maaf ya Nak, Ibu agak bingung sedikit. Bisa diulangi?";
      
      const errorString = JSON.stringify(error).toUpperCase();
      if (errorString.includes("429") || errorString.includes("QUOTA") || errorString.includes("EXHAUSTED") || error?.status === 429) {
        errorMessage = "Aduh Nak, sepertinya Ibu sedang sangat sibuk melayani banyak siswa (Quota Terlampaui). Tunggu sebentar ya, nanti coba sapa Ibu lagi.";
      }

      setMessages(prev => {
        // Remove the empty message if it was added during streaming
        const filtered = prev.filter(m => m.content !== "" || m.role !== 'assistant');
        return [...filtered, { id: (Date.now() + 1).toString(), role: 'assistant', content: errorMessage }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleListen = async (textToSpeak?: string) => {
    let text = textToSpeak || [...messages].reverse().find(m => m.role === 'assistant')?.content;
    if (!text || isSpeaking) return;

    // Strip markdown images for TTS
    text = text.replace(/!\[.*?\]\(.*?\)/g, '');

    setIsSpeaking(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Warm, empathetic voice
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = audioContext.createBuffer(1, bytes.length / 2, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        const dataView = new DataView(bytes.buffer);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = dataView.getInt16(i * 2, true) / 32768;
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
    }
  };

  const handleLewisSave = (data: string) => {
    setShowLewisCanvas(false);
    setInput("Ibu, ini struktur Lewis yang aku buat di laboratorium interaktif.");
    // In a real app we'd convert the canvas to an image, but for this demo 
    // we'll just send the text and Ibu will respond.
    handleSend();
  };

  const handleSpeechToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Maaf Nak, browsermu tidak mendukung fitur bicara. Coba gunakan Chrome ya.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'not-allowed') {
        alert("Akses mikrofon ditolak, Nak. Tolong izinkan akses mikrofon di pengaturan browsermu ya supaya kita bisa bicara.");
      } else if (event.error === 'no-speech') {
        // Silent error for no speech detected
      } else {
        alert("Aduh, ada kendala sedikit saat Ibu mencoba mendengarmu. Bisa dicoba lagi?");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    
    // Brief delay for animation
    await new Promise(resolve => setTimeout(resolve, 800));

    // Save to local storage as "archive" before clearing
    const existingArchives = JSON.parse(localStorage.getItem('chemcaradde_archives') || '[]');
    const newArchive = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      messages: messages,
      progress: progress
    };
    localStorage.setItem('chemcaradde_archives', JSON.stringify([...existingArchives, newArchive]));
    
    // Reset state
    setMessages([]);
    setProgress(0);
    setIsArchiving(false);
    setShowArchiveConfirm(false);
    handleInitialGreeting();
  };

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto shadow-2xl bg-warm-paper border-x border-warm-accent/10">
      <AnimatePresence>
        {showLewisCanvas && (
          <LewisCanvas 
            onClose={() => setShowLewisCanvas(false)} 
            onSave={handleLewisSave} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCamera && (
          <CameraCapture 
            onCapture={(img) => {
              setSelectedImage(img);
              setActiveTab('chat');
              setInput("Ibu, tolong koreksi jawaban saya dari foto ini ya Bu.");
            }}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="p-6 border-b border-warm-accent/20 flex items-center justify-between bg-warm-paper/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-warm-accent flex items-center justify-center text-warm-bg shadow-inner">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="serif text-2xl font-semibold text-warm-accent">ChemCaradde</h1>
            <p className="text-xs uppercase tracking-widest text-warm-accent/60 font-medium">Guru Kimia Virtual</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1 bg-warm-bg/50 p-1 rounded-2xl border border-warm-accent/10">
          {[
            { id: 'chat', label: 'Belajar', icon: Heart },
            { id: 'materi', label: 'Materi', icon: BookOpen },
            { id: 'hots', label: 'Soal HOTS', icon: Sparkles },
            { id: 'scan', label: 'Koreksi', icon: Camera },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-warm-accent text-warm-bg shadow-md' 
                  : 'text-warm-accent/60 hover:bg-warm-accent/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="flex gap-2">
          <button 
            onClick={toggleNotifications}
            className={`p-2 rounded-full transition-colors ${notificationsEnabled ? 'text-warm-accent bg-warm-accent/10' : 'text-warm-accent/40 hover:bg-warm-accent/10'}`}
            title={notificationsEnabled ? "Matikan Pengingat" : "Aktifkan Pengingat Belajar"}
          >
            {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowArchiveConfirm(true)}
            className="p-2 rounded-full hover:bg-warm-accent/10 text-warm-accent transition-colors"
            title="Arsipkan Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="px-3 py-1 rounded-full bg-warm-bg border border-warm-accent/10 text-[10px] font-semibold uppercase tracking-tighter text-warm-accent/70 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Ikatan Ion
          </div>
        </div>
      </header>

      {/* Archive Confirmation Modal */}
      <AnimatePresence>
        {showArchiveConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-warm-bg/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-warm-paper p-8 rounded-3xl shadow-2xl border border-warm-accent/10 max-w-sm w-full text-center relative overflow-hidden"
            >
              {isArchiving && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-10 bg-warm-paper flex flex-col items-center justify-center"
                >
                  <motion.div 
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { repeat: Infinity, duration: 1, ease: "linear" },
                      scale: { repeat: Infinity, duration: 1 }
                    }}
                    className="text-warm-accent mb-4"
                  >
                    <RefreshCcw className="w-10 h-10" />
                  </motion.div>
                  <p className="serif text-lg font-bold text-warm-accent">Mengarsipkan...</p>
                </motion.div>
              )}

              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="serif text-2xl font-bold text-warm-accent mb-2">Arsipkan Chat?</h3>
              <p className="text-sm text-warm-accent/60 mb-8 leading-relaxed">
                Pesanmu akan disimpan ke arsip lokal dan percakapan akan dimulai dari awal. Kamu yakin, Nak?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  Ya, Arsipkan
                </button>
                <button 
                  onClick={() => setShowArchiveConfirm(false)}
                  disabled={isArchiving}
                  className="w-full py-3 bg-warm-bg text-warm-accent rounded-xl font-bold uppercase tracking-widest border border-warm-accent/10 disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Progress Bar */}
      <div className="px-6 py-3 bg-warm-paper border-b border-warm-accent/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-warm-accent/40">Progres Belajar Mandiri</span>
          <span className="text-[10px] font-bold text-warm-accent">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 w-full bg-warm-accent/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-warm-accent"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {activeTab === 'chat' && (
          <>
            <AnimatePresence>
              {!notificationsEnabled && "Notification" in window && Notification.permission !== "denied" && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-warm-accent/10 p-4 rounded-2xl border border-warm-accent/20 flex items-center justify-between gap-4 mb-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-warm-accent text-warm-bg rounded-full flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-warm-accent uppercase tracking-widest mb-0.5">Aktifkan Pengingat?</p>
                      <p className="text-[10px] text-warm-accent/60 leading-tight">Ibu akan mengingatkanmu jika kamu lupa melanjutkan belajar, Nak.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={testNotification}
                      className="px-3 py-2 bg-warm-accent/10 text-warm-accent rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-warm-accent/20 transition-all"
                    >
                      Tes
                    </button>
                    <button 
                      onClick={toggleNotifications}
                      className="px-4 py-2 bg-warm-accent text-warm-bg rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      Aktifkan
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 mb-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${msg.role === 'user' ? 'bg-warm-accent text-warm-bg' : 'bg-warm-bg text-warm-accent border border-warm-accent/20'}`}>
                        {msg.role === 'user' ? <User className="w-3 h-3" /> : 'AI'}
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-semibold opacity-40">
                        {msg.role === 'user' ? 'Kamu' : 'ChemCaradde'}
                      </span>
                    </div>
                    
                    <div className={`p-5 rounded-2xl shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-warm-accent text-warm-bg rounded-tr-none' 
                        : 'bg-warm-bg text-warm-ink rounded-tl-none border border-warm-accent/5'
                    }`}>
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Uploaded" 
                          className="max-w-full rounded-lg mb-3 border border-warm-paper/20 shadow-sm" 
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className={`leading-relaxed whitespace-pre-wrap ${msg.role === 'assistant' ? 'serif text-lg' : 'text-sm'}`}>
                        {msg.content || (msg.role === 'assistant' && isLoading && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>...</motion.span>)}
                        <Markdown
                          components={{
                            img: ({ node, ...props }) => (
                              <img 
                                {...props} 
                                className="max-w-full rounded-lg my-4 border border-warm-accent/10 shadow-sm" 
                                referrerPolicy="no-referrer"
                              />
                            )
                          }}
                        >
                          {msg.content}
                        </Markdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && messages[messages.length-1]?.role === 'user' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-warm-bg p-4 rounded-2xl rounded-tl-none border border-warm-accent/5 shadow-sm">
                    <div className="flex gap-1">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-warm-accent rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-warm-accent rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-warm-accent rounded-full" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </>
        )}

        {activeTab === 'materi' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 pb-12"
          >
            <div className="bg-warm-accent/5 p-8 rounded-3xl border border-warm-accent/10">
              <h2 className="serif text-3xl font-bold text-warm-accent mb-4">Materi Ikatan Ion</h2>
              <p className="text-warm-accent/70 leading-relaxed">
                Ikatan ion adalah ikatan yang terbentuk akibat adanya serah terima elektron antara atom yang melepaskan elektron (logam) dengan atom yang menerima elektron (non-logam). Klik kartu materi di bawah untuk penjelasan lebih lengkap.
              </p>
            </div>

            <div className="grid gap-6">
              {[
                { 
                  title: "Kestabilan Atom", 
                  desc: "Atom cenderung ingin stabil seperti gas mulia dengan memiliki 8 elektron valensi (Oktet) atau 2 (Duplet).",
                  detail: "Atom-atom di alam umumnya tidak stabil karena kulit terluarnya belum penuh. Untuk mencapai kestabilan, atom akan berusaha memiliki konfigurasi elektron seperti Gas Mulia (Golongan VIIIA).",
                  example: "Atom Natrium (Na) memiliki nomor atom 11 dengan konfigurasi 2, 8, 1. Agar stabil (Oktet), Na lebih mudah melepaskan 1 elektron terluarnya menjadi Na+ (2, 8)."
                },
                { 
                  title: "Pembentukan Ion", 
                  desc: "Logam melepaskan elektron menjadi kation (+), Non-logam menerima elektron menjadi anion (-).",
                  detail: "Proses ini terjadi karena perbedaan keelektronegatifan yang besar. Atom logam yang memiliki energi ionisasi rendah akan melepaskan elektron, sedangkan atom non-logam yang memiliki afinitas elektron tinggi akan menangkap elektron tersebut.",
                  example: "Atom Klorin (Cl) dengan nomor atom 17 (2, 8, 7) akan menangkap 1 elektron yang dilepaskan Na tadi, sehingga menjadi ion Cl- (2, 8, 8)."
                },
                { 
                  title: "Gaya Elektrostatik", 
                  desc: "Kation dan Anion tarik-menarik dengan gaya elektrostatik yang sangat kuat membentuk kristal.",
                  detail: "Setelah terbentuk ion positif (kation) dan ion negatif (anion), keduanya akan saling tarik-menarik karena perbedaan muatan. Gaya tarik ini disebut Gaya Coulomb atau Gaya Elektrostatik.",
                  example: "Ion Na+ dan Cl- akan saling tarik-menarik membentuk kisi kristal NaCl yang teratur, di mana setiap satu ion Na+ dikelilingi oleh 6 ion Cl- dan sebaliknya."
                },
                { 
                  title: "Sifat Senyawa Ion", 
                  desc: "Titik leleh tinggi, rapuh, dan dapat menghantarkan listrik dalam bentuk lelehan atau larutan.",
                  detail: "Karena gaya elektrostatiknya sangat kuat, dibutuhkan energi yang besar (panas tinggi) untuk memutus ikatan tersebut. Selain itu, dalam bentuk cair, ion-ion bebas bergerak sehingga bisa menghantarkan listrik.",
                  example: "Garam dapur (NaCl) tidak menghantarkan listrik saat berbentuk bongkahan padat, tetapi jika kamu larutkan dalam air, larutan tersebut bisa menyalakan lampu dalam uji elektrolit."
                }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  layout
                  onClick={() => setExpandedMateri(expandedMateri === i ? null : i)}
                  className="p-6 bg-warm-paper rounded-2xl border border-warm-accent/10 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="serif text-xl font-bold text-warm-accent mb-2">{item.title}</h3>
                      <p className="text-sm text-warm-accent/60 leading-relaxed">{item.desc}</p>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMateri === i ? 180 : 0 }}
                      className="text-warm-accent/30"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {expandedMateri === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="border-t border-warm-accent/5 pt-6 space-y-4"
                      >
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-warm-accent/40">Penjelasan Mendalam</h4>
                          <p className="text-sm text-warm-ink leading-relaxed">{item.detail}</p>
                        </div>
                        <div className="p-4 bg-warm-bg rounded-xl border border-warm-accent/5">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-warm-accent/40 mb-2">Contoh Nyata</h4>
                          <p className="text-sm text-warm-accent font-medium italic leading-relaxed">{item.example}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Interactive Quiz Section */}
            <div className="mt-12 p-8 bg-warm-accent text-warm-bg rounded-3xl shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6" />
                <h2 className="serif text-2xl font-bold">Kuis Interaktif</h2>
              </div>
              
              {currentQuizIndex < 3 ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-70">
                    <span>Pertanyaan {currentQuizIndex + 1} dari 3</span>
                    <span>Skor: {quizScore}</span>
                  </div>
                  
                  <p className="serif text-xl leading-relaxed">
                    {[
                      "Mengapa atom cenderung membentuk ikatan kimia?",
                      "Apa yang terjadi pada atom logam saat membentuk ikatan ion?",
                      "Gaya apa yang menyatukan kation dan anion dalam senyawa ion?"
                    ][currentQuizIndex]}
                  </p>
                  
                  <div className="grid gap-3">
                    {[
                      [
                        "Agar memiliki massa yang lebih besar",
                        "Untuk mencapai konfigurasi elektron yang stabil seperti gas mulia",
                        "Agar dapat berubah menjadi atom lain",
                        "Untuk melepaskan semua protonnya"
                      ],
                      [
                        "Menerima elektron dan menjadi anion",
                        "Melepaskan proton dan menjadi netral",
                        "Melepaskan elektron dan menjadi kation",
                        "Berbagi elektron dengan atom logam lain"
                      ],
                      [
                        "Gaya gravitasi",
                        "Gaya magnetik",
                        "Gaya elektrostatik (Coulomb)",
                        "Gaya gesek"
                      ]
                    ][currentQuizIndex].map((option, idx) => (
                      <button
                        key={idx}
                        disabled={showQuizFeedback}
                        onClick={() => setSelectedQuizOption(idx)}
                        className={`p-4 rounded-xl text-left text-sm transition-all border-2 ${
                          selectedQuizOption === idx 
                            ? 'bg-warm-bg text-warm-accent border-warm-bg' 
                            : 'bg-warm-accent/20 border-warm-bg/20 hover:border-warm-bg'
                        } ${
                          showQuizFeedback && idx === [1, 2, 2][currentQuizIndex]
                            ? 'bg-green-500 border-green-500 text-white'
                            : showQuizFeedback && selectedQuizOption === idx && idx !== [1, 2, 2][currentQuizIndex]
                            ? 'bg-red-500 border-red-500 text-white'
                            : ''
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  
                  {!showQuizFeedback ? (
                    <button
                      disabled={selectedQuizOption === null}
                      onClick={() => {
                        const isCorrect = selectedQuizOption === [1, 2, 2][currentQuizIndex];
                        if (isCorrect) {
                          setQuizScore(prev => prev + 10);
                          confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
                        }
                        setShowQuizFeedback(true);
                      }}
                      className="w-full py-4 bg-warm-bg text-warm-accent rounded-xl font-bold uppercase tracking-widest shadow-lg disabled:opacity-50"
                    >
                      Cek Jawaban
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-warm-bg/10 rounded-xl border border-warm-bg/20">
                        <p className="text-sm font-medium">
                          {selectedQuizOption === [1, 2, 2][currentQuizIndex] ? "✅ Hebat! " : "❌ Kurang tepat. "}
                          {[
                            "Atom berikatan untuk mencapai kestabilan (Oktet atau Duplet) seperti gas mulia.",
                            "Logam cenderung melepaskan elektron valensinya untuk menjadi ion positif (kation).",
                            "Gaya tarik-menarik antara muatan positif dan negatif disebut gaya elektrostatik."
                          ][currentQuizIndex]}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentQuizIndex(prev => prev + 1);
                          setSelectedQuizOption(null);
                          setShowQuizFeedback(false);
                        }}
                        className="w-full py-4 bg-warm-bg text-warm-accent rounded-xl font-bold uppercase tracking-widest shadow-lg"
                      >
                        {currentQuizIndex === 2 ? "Lihat Hasil" : "Pertanyaan Selanjutnya"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-warm-bg rounded-full flex items-center justify-center mx-auto text-warm-accent shadow-inner">
                    <Heart className="w-10 h-10 fill-current" />
                  </div>
                  <div>
                    <h3 className="serif text-3xl font-bold mb-2">Kuis Selesai!</h3>
                    <p className="text-warm-bg/70">Skormu: {quizScore} / 30</p>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentQuizIndex(0);
                      setQuizScore(0);
                      setSelectedQuizOption(null);
                      setShowQuizFeedback(false);
                    }}
                    className="px-8 py-3 bg-warm-bg text-warm-accent rounded-full font-bold uppercase tracking-widest shadow-lg"
                  >
                    Ulangi Kuis
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'hots' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 pb-12"
          >
            <div className="bg-warm-accent/5 p-8 rounded-3xl border border-warm-accent/10">
              <h2 className="serif text-3xl font-bold text-warm-accent mb-4">Tantangan HOTS</h2>
              <p className="text-warm-accent/70 leading-relaxed">
                Uji pemahamanmu dengan soal-soal Higher Order Thinking Skills yang membutuhkan analisis mendalam.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { 
                  q: "Mengapa senyawa ion seperti NaCl bersifat isolator dalam bentuk padat, namun menjadi konduktor yang baik saat dilarutkan dalam air?", 
                  hint: "Pikirkan tentang mobilitas ion-ion dalam kisi kristal padat vs dalam larutan." 
                },
                { 
                  q: "Analisis mengapa titik leleh MgO (2852°C) jauh lebih tinggi dibandingkan NaCl (801°C) padahal keduanya adalah senyawa ion.", 
                  hint: "Perhatikan muatan ion (Mg2+, O2- vs Na+, Cl-) dan hubungannya dengan hukum Coulomb." 
                },
                { 
                  q: "Jika sebuah atom X memiliki nomor atom 12 dan atom Y memiliki nomor atom 17, prediksikan rumus kimia dan jenis ikatan yang terbentuk!", 
                  hint: "Tentukan konfigurasi elektron masing-masing untuk mengetahui elektron valensinya." 
                }
              ].map((item, i) => (
                <div key={i} className="p-6 bg-warm-paper rounded-2xl border border-warm-accent/10 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-warm-accent text-warm-bg text-[10px] font-bold rounded-md uppercase">Soal {i+1}</span>
                  </div>
                  <p className="serif text-lg text-warm-accent mb-4 leading-relaxed">{item.q}</p>
                  <div className="p-4 bg-warm-bg rounded-xl border border-warm-accent/5">
                    <p className="text-xs text-warm-accent/50 italic flex items-center gap-2">
                      <Info className="w-3 h-3" />
                      Petunjuk: {item.hint}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('chat');
                      setInput(`Ibu, aku ingin mencoba menjawab soal HOTS nomor ${i+1}: ${item.q}`);
                    }}
                    className="mt-4 text-xs font-bold text-warm-accent uppercase tracking-widest hover:underline"
                  >
                    Jawab di Chat →
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'scan' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
          >
            <div className="max-w-md space-y-6">
              <div className="w-24 h-24 bg-warm-accent/10 rounded-full flex items-center justify-center mx-auto text-warm-accent">
                <Camera className="w-12 h-12" />
              </div>
              <div>
                <h2 className="serif text-3xl font-bold text-warm-accent mb-4">Koreksi Jawaban Mandiri</h2>
                <p className="text-warm-accent/70 leading-relaxed">
                  Sudah mencoba mengerjakan soal secara mandiri, Nak? Jika sudah yakin, kamu bisa menggunakan fitur ini untuk meminta Ibu mengoreksi jawabanmu dari foto.
                </p>
              </div>
              
              <div className="p-6 bg-warm-paper rounded-3xl border border-warm-accent/10 shadow-sm space-y-4">
                <div className="flex items-start gap-3 text-left">
                  <div className="w-6 h-6 bg-warm-accent text-warm-bg rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1">1</div>
                  <p className="text-xs text-warm-accent/70">Tuliskan struktur Lewis atau proses ikatan ion di buku tulismu.</p>
                </div>
                <div className="flex items-start gap-3 text-left">
                  <div className="w-6 h-6 bg-warm-accent text-warm-bg rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1">2</div>
                  <p className="text-xs text-warm-accent/70">Klik tombol di bawah untuk membuka kamera dan ambil foto jawabanmu.</p>
                </div>
                <div className="flex items-start gap-3 text-left">
                  <div className="w-6 h-6 bg-warm-accent text-warm-bg rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1">3</div>
                  <p className="text-xs text-warm-accent/70">Ibu akan memberikan skor dan saran perbaikan secara langsung.</p>
                </div>
              </div>

              <button 
                onClick={() => setShowCamera(true)}
                className="w-full py-4 bg-warm-accent text-warm-bg rounded-2xl font-bold uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Camera className="w-6 h-6" />
                Buka Kamera Sekarang
              </button>
              
              <p className="text-[10px] text-warm-accent/40 uppercase tracking-widest font-bold">
                Gunakan hanya setelah kamu mencoba sendiri ya, Nak!
              </p>
            </div>
          </motion.div>
        )}
      </main>

      {/* Input Area */}
      <footer className="p-6 bg-warm-paper border-t border-warm-accent/10 sticky bottom-0">
        {selectedImage && (
          <div className="mb-4 relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-24 w-24 object-cover rounded-xl border-2 border-warm-accent shadow-lg" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-warm-accent text-warm-bg rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
            >
              <RefreshCcw className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-3 bg-warm-bg p-2 rounded-3xl border border-warm-accent/10 focus-within:border-warm-accent/30 transition-all shadow-inner">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-full hover:bg-warm-accent/10 text-warm-accent transition-colors"
            title="Upload Foto Jawaban"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowLewisCanvas(true)}
            className="p-3 rounded-full hover:bg-warm-accent/10 text-warm-accent transition-colors"
            title="Buka Lab Lewis"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik pesanmu di sini, Nak..."
            className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-1 resize-none min-h-[44px] max-h-32 text-sm placeholder:text-warm-accent/30"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className={`p-3 rounded-full transition-all ${
              (!input.trim() && !selectedImage) || isLoading 
                ? 'bg-warm-accent/10 text-warm-accent/30' 
                : 'bg-warm-accent text-warm-bg hover:scale-105 active:scale-95 shadow-md'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-8">
           <button 
             onClick={handleSpeechToText}
             className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors group ${
               isListening ? 'text-warm-accent animate-pulse' : 'text-warm-accent/40 hover:text-warm-accent'
             }`}
           >
             <Mic className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${isListening ? 'fill-current' : ''}`} />
             {isListening ? 'Mendengarkan...' : 'Bicara'}
           </button>
           <button 
             onClick={() => handleListen()}
             disabled={isSpeaking || messages.filter(m => m.role === 'assistant').length === 0}
             className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors group ${
               isSpeaking ? 'text-warm-accent animate-pulse' : 'text-warm-accent/40 hover:text-warm-accent'
             }`}
           >
             <Volume2 className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${isSpeaking ? 'fill-current' : ''}`} />
             {isSpeaking ? 'Mendengarkan...' : 'Dengarkan'}
           </button>
           <button 
             onClick={() => setIsAutoPlay(!isAutoPlay)}
             className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors group ${
               isAutoPlay ? 'text-warm-accent' : 'text-warm-accent/40 hover:text-warm-accent'
             }`}
           >
             <RefreshCcw className={`w-3.5 h-3.5 group-hover:rotate-180 transition-transform ${isAutoPlay ? 'animate-spin-slow' : ''}`} />
             Auto: {isAutoPlay ? 'ON' : 'OFF'}
           </button>
        </div>
      </footer>
    </div>
  );
}
