'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Info } from 'lucide-react';
import type { LocationScenario, HouseholdProfile } from '@/domain/scenarios';
import type { VentilationWindow } from '@/domain/naqi';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  source?: 'ai' | 'basic';
}

interface CopilotChatProps {
  location: LocationScenario;
  profile: HouseholdProfile;
  vent: VentilationWindow | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onResetChat: () => void;
  isLoading: boolean;
}

const STARTER_CHIPS = [
  'Is it safe for morning walk at 7 AM?',
  'Zero-cost ways to seal bedroom window gaps?',
  'Why does wet mopping beat dry sweeping?',
  "Explain today's smog in simple Hindi",
];

function renderFormatted(text: string) {
  return text.split('\n').map((line, idx) => (
    <span key={idx} className="block min-h-[1.2em]">
      {line.split(/(\*\*.*?\*\*)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          p
        )
      )}
    </span>
  ));
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'items-start gap-2.5'}`}>
      {msg.role === 'assistant' && (
        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}
      <div
        lang={/[\u0900-\u097F]/.test(msg.text) ? 'hi' : undefined}
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
          msg.role === 'user'
            ? 'rounded-br-sm bg-teal-700 text-white'
            : 'rounded-tl-sm bg-white border border-stone-200 text-slate-800'
        }`}
      >
        {renderFormatted(msg.text)}
        {msg.role === 'assistant' && msg.source && (
          <div className="mt-1.5 flex justify-end">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${msg.source === 'ai' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-stone-100 text-slate-600 border-stone-200'}`}
            >
              {msg.source === 'ai' ? 'AI' : 'Basic mode'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatInputBarProps {
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function ChatInputBar({ input, setInput, isLoading, onSubmit }: ChatInputBarProps) {
  return (
    <div className="p-3.5 border-t border-stone-200 bg-white rounded-b-2xl space-y-2">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="text"
          aria-label="Ask a question about air quality"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about school commute, DIY filters, or type in Hindi/Hinglish..."
          className="flex-1 px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
        />
        <button
          type="submit"
          aria-label="Ask question"
          disabled={isLoading || !input.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
      <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>
          Non-medical informational guidance only. Consult a doctor immediately for breathing
          distress.
        </span>
      </p>
    </div>
  );
}

function ChatHeader({ onResetChat }: { onResetChat: () => void }) {
  return (
    <div className="p-4 border-b border-stone-200 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900">Ask VayuSaathi Copilot</h3>
          <p className="text-[11px] text-slate-600">
            Grounded in live CPCB NAQI &amp; your household profile • English, Hindi &amp; Hinglish
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onResetChat}
        className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition"
      >
        Reset
      </button>
    </div>
  );
}

function ChatLoadingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white border border-stone-200 px-4 py-3 text-xs text-slate-600 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse-soft" />
        <span>VayuSaathi is checking live smog data...</span>
      </div>
    </div>
  );
}

function ChatStarterChips({ onSelect }: { onSelect: (chip: string) => void }) {
  return (
    <div className="px-4 py-2.5 bg-stone-50/80 border-b border-stone-200/70 flex items-center gap-2 overflow-x-auto no-scrollbar">
      {STARTER_CHIPS.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(chip)}
          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-stone-200 hover:border-teal-300 transition"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

/** Interactive Q&A copilot grounded in the household profile and current AQI. */
export function CopilotChat({ messages, onSendMessage, onResetChat, isLoading }: CopilotChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    void onSendMessage(text);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[600px] sm:h-[640px]">
      <ChatHeader onResetChat={onResetChat} />
      <ChatStarterChips onSelect={(chip) => void onSendMessage(chip)} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F7F6F2]/40">
        {messages.map((msg, idx) => (
          <ChatBubble key={idx} msg={msg} />
        ))}
        {isLoading && <ChatLoadingBubble />}
      </div>
      <ChatInputBar
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
