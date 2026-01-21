import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface AIAssistantProps {
  onClose: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello. I am the Omnia System AI. I can assist you with app features, lighting design strategies, or pricing configuration. How can I help you today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `
        You are the AI Specialist for "Omnia Light Scape Pro", a high-end landscape lighting mockup tool used by professionals.

        # SYSTEM CAPABILITIES & WORKFLOWS

        ## 1. EDITOR TAB (The Core Tool)
        - **Purpose**: Transform daylight photos into photorealistic night scenes.
        - **Workflow**:
          1. **Upload**: User uploads a photo of a client's house.
          2. **Configure**:
             - **Fixture Toggles**: Users can toggle specific lighting types:
               - *Up Lights*: For walls, columns, and trees.
               - *Path Lights*: For walkways.
               - *Gutter Lights*: For upper peaks (shining UP).
               - *Soffit Lights*: Recessed downlights in eaves.
               - *Hardscape*: For retaining walls/steps.
               - *Core Drill*: In-grade lights for driveways/concrete.
             - **Custom Notes**: Users can type specific instructions.
          3. **Generate**: Uses 'Gemini 3 Pro' to render the scene.
          4. **Refine**: Users can dislike a result and provide feedback to re-generate.
          5. **Save**: Projects can be saved to the database.

        ## 2. QUOTES TAB (Estimator)
        - **Purpose**: Create professional PDF proposals.
        - **Auto-Generation**: System counts fixtures based on the user's prompt or uses intelligent defaults.
        - **Editing**: Users can manually adjust quantities, prices, descriptions.
        - **Output**: Generates a branded PDF with the user's company logo and details.

        ## 3. PROJECTS TAB (Library)
        - Stores saved scenes and quotes.
        - Users can download high-res images or PDFs from here.
        - Users can reload a scene into the Editor to try new variations.

        ## 4. SETTINGS TAB (Configuration)
        - **Company Profile**: Set business name, address, logo, and email.
        - **Pricing**: Configure base costs for each fixture type.
        - **Lighting Engine**: Color temp, intensity, beam angle settings.

        # YOUR PERSONA
        - You are a **Senior Lighting Designer & Technical Support Specialist**.
        - Tone: Professional, sophisticated, architectural, concise.
        - If asked about pricing, refer to the Settings pricing section.
        - If asked about "how to make it look real", suggest using 3000K color temp and 45% intensity.
      `;

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const result = await chat.sendMessage({ message: userMsg });

      setMessages(prev => [...prev, { role: 'model', text: result.text || "I couldn't process that." }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "System Error: Unable to connect to neural backend." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full md:h-[500px] bg-[#0a0a0a] md:rounded-2xl overflow-hidden md:border md:border-white/10">
      {/* Header */}
      <div className="bg-[#111] p-4 flex justify-between items-center border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F6B45A] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Omnia Assistant</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] text-gray-400 font-mono">ONLINE</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-[#111] border border-white/5 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-[#F6B45A]" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#F6B45A] text-black font-medium rounded-tr-sm'
                : 'bg-[#111] text-gray-200 border border-white/5 rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-[#111] border border-white/5 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-[#F6B45A]" />
            </div>
            <div className="bg-[#111] border border-white/5 rounded-2xl rounded-tl-sm p-3 flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:75ms]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#111] border-t border-white/5 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about pricing or design..."
            className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/20 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 p-2 bg-[#F6B45A] text-black rounded-lg hover:bg-[#ffc67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
