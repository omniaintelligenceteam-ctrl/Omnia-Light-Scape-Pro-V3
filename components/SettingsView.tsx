import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, ChevronDown, ChevronUp, Upload, Check, Building, DollarSign, Lightbulb, Save, LogOut, MapPin, X, Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { COLOR_TEMPERATURES, DEFAULT_PRICING } from '../constants';
import { FixturePricing, CompanyProfile } from '../types';

interface SettingsViewProps {
  profile?: CompanyProfile;
  onProfileChange?: (profile: CompanyProfile) => void;
  colorTemp?: string;
  onColorTempChange?: (tempId: string) => void;
  pricing?: FixturePricing[];
  onPricingChange?: (pricing: FixturePricing[]) => void;
}

// --- UI COMPONENTS ---

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition-all duration-300 ease-out relative border ${
      checked ? 'bg-[#F6B45A]/20 border-[#F6B45A]' : 'bg-black border-white/10'
    }`}
  >
    <div
      className={`w-4 h-4 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] absolute top-0.5 transition-all duration-300 ${
        checked ? 'left-[26px] bg-[#F6B45A]' : 'left-1 bg-gray-500'
      }`}
    />
  </button>
);

const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ icon: Icon, title, subtitle, isOpen, onToggle }) => (
  <div 
    onClick={() => onToggle()}
    className={`flex items-center justify-between p-6 cursor-pointer transition-all duration-300 border-b border-white/5 ${isOpen ? 'bg-white/5' : 'hover:bg-white/5'}`}
  >
    <div className="flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#F6B45A] text-black shadow-[0_0_15px_rgba(246,180,90,0.4)]' : 'bg-[#1a1a1a] text-gray-400'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className={`text-lg font-bold font-serif tracking-wide ${isOpen ? 'text-white' : 'text-gray-300'}`}>{title}</h3>
        <p className="text-xs text-gray-300 font-mono uppercase tracking-wider mt-1">{subtitle}</p>
      </div>
    </div>
    <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#F6B45A]' : 'text-gray-400'}`}>
      <ChevronDown className="w-5 h-5" />
    </div>
  </div>
);

// --- AI ASSISTANT LOGIC ---

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const AIAssistant: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
        You are the AI Specialist for "Omnia Light Scape Pro", a high-end landscape lighting mockup tool.
        
        APP KNOWLEDGE BASE:
        1. **Editor Tab**: Users upload daylight photos. You use Gemini 3 Pro to generate photorealistic night scenes.
           - Strategies: Up Lights, Path Lights, Gutter Mounts, Soffit Lights.
           - Configuration: Users can set output color temperature/theme in settings.
        2. **Quotes Tab**: Generates PDF estimates. 
           - Users can add/remove line items, set tax rates, and discounts.
           - Professional print-ready layout.
        3. **Projects Tab**: A gallery of saved scenes and quotes.
        4. **Settings Tab**: Where users configure company profile, default pricing, and lighting engine realism.

        YOUR PERSONA:
        - highly professional, technical, concise, and polite.
        - You speak like a high-end architectural consultant.
        - Keep answers short and helpful.
      `;

      const chat = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
              systemInstruction: systemInstruction,
          }
      });

      // Reconstruct history
      const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      // In a real app we'd pass history to chat initialization or keep the chat instance alive.
      // For this stateless demo, we send the message. 
      // Note: If using persistent chat, instantiate 'chat' outside handler.
      // Since we re-create here, let's just use generateContent with the last prompt + context instructions if needed, 
      // but for simplicity in this snippet we'll just send the message to a fresh chat 
      // (or ideally, move 'chat' to component state).
      
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
    <div className="flex flex-col h-[500px] bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="bg-[#1a1a1a] p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F6B45A] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">Omnia Assistant</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] text-gray-300 font-mono">ONLINE</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/5 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-[#F6B45A]" />
                        </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-[#F6B45A] text-black font-medium rounded-tr-sm' 
                        : 'bg-[#1a1a1a] text-gray-200 border border-white/5 rounded-tl-sm'
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
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-white/5 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-[#F6B45A]" />
                    </div>
                    <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl rounded-tl-sm p-3 flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-[#1a1a1a] border-t border-white/5">
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about pricing or design..."
                    className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 font-mono transition-all"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 top-2 p-1.5 bg-[#F6B45A] text-black rounded-lg hover:bg-[#ffc67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );
};

// --- MAIN SETTINGS COMPONENT ---

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    profile, 
    onProfileChange, 
    colorTemp = '3000k',
    onColorTempChange,
    pricing,
    onPricingChange
}) => {
  const [activeSection, setActiveSection] = useState<string | null>('company');
  
  // Local state for profile editing to avoid constant parent re-renders if needed, 
  // but for simplicity we'll control directly if props allow, or use local state and save.
  // Here we use the props directly as they are passed from App.tsx.
  
  const handleProfileUpdate = (key: keyof CompanyProfile, value: string) => {
      if (onProfileChange && profile) {
          onProfileChange({ ...profile, [key]: value });
      }
  };

  const handlePriceUpdate = (index: number, field: keyof FixturePricing, value: any) => {
    if (!pricing || !onPricingChange) return;
    const newPricing = [...pricing];
    newPricing[index] = { ...newPricing[index], [field]: value };
    onPricingChange(newPricing);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && onProfileChange && profile) {
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  onProfileChange({ ...profile, logo: event.target.result as string });
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  return (
    <div className="h-full bg-[#050505] overflow-y-auto relative">
      <div className="max-w-3xl mx-auto p-4 md:p-12 pb-24 relative z-10">
        
        <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white font-serif tracking-tight mb-2">Settings</h2>
            <div className="h-1 w-20 bg-[#F6B45A] rounded-full"></div>
        </div>

        {/* --- SECTION 1: COMPANY PROFILE --- */}
        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden mb-6 shadow-xl">
            <SectionHeader 
                icon={Building} 
                title="Company Profile" 
                subtitle="Manage your branding for estimates"
                isOpen={activeSection === 'company'}
                onToggle={() => setActiveSection(activeSection === 'company' ? null : 'company')}
            />
            
            {activeSection === 'company' && profile && (
                <div className="p-6 md:p-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Logo Upload */}
                        <div className="flex flex-col gap-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-300">Company Logo</label>
                            <div className="relative group w-32 h-32 bg-black border border-dashed border-white/20 rounded-xl flex items-center justify-center overflow-hidden hover:border-[#F6B45A] transition-colors cursor-pointer">
                                {profile.logo ? (
                                    <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#F6B45A] transition-colors">
                                        <Upload className="w-6 h-6" />
                                        <span className="text-[9px] font-bold uppercase">Upload</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-300 block mb-2">Company Name</label>
                                <input 
                                    type="text" 
                                    value={profile.name}
                                    onChange={(e) => handleProfileUpdate('name', e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#F6B45A] focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-300 block mb-2">Contact Email</label>
                                <input 
                                    type="email" 
                                    value={profile.email}
                                    onChange={(e) => handleProfileUpdate('email', e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#F6B45A] focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                         <div className="md:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-300 block mb-2">Business Address</label>
                                <textarea 
                                    value={profile.address}
                                    onChange={(e) => handleProfileUpdate('address', e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#F6B45A] focus:outline-none transition-colors resize-none"
                                />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- SECTION 2: COMPANY PRICING (NEW) --- */}
        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden mb-6 shadow-xl">
            <SectionHeader 
                icon={DollarSign} 
                title="Company Pricing" 
                subtitle="Set your standard unit prices for auto-quotes"
                isOpen={activeSection === 'pricing'}
                onToggle={() => setActiveSection(activeSection === 'pricing' ? null : 'pricing')}
            />
            
            {activeSection === 'pricing' && pricing && (
                <div className="p-6 md:p-8 animate-in slide-in-from-top-4 duration-300 space-y-6">
                    {pricing.map((item, index) => (
                        <div key={item.id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6 relative group hover:border-[#F6B45A]/30 transition-colors">
                            <div className="absolute -top-3 left-6">
                                <span className="text-[10px] font-bold uppercase bg-[#F6B45A] text-black px-3 py-1 rounded-full shadow-lg">
                                    {item.fixtureType.toUpperCase()}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                {/* Display Name */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        Display Name
                                    </label>
                                    <input 
                                        type="text" 
                                        value={item.name}
                                        onChange={(e) => handlePriceUpdate(index, 'name', e.target.value)}
                                        className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-bold focus:border-[#F6B45A] focus:outline-none transition-colors"
                                    />
                                </div>

                                {/* Unit Price */}
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        Unit Price
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-bold">$</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={item.unitPrice}
                                            onChange={(e) => handlePriceUpdate(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-[#111] border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white text-sm font-mono font-bold focus:border-[#F6B45A] focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Product Details */}
                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        Product Details / Warranty Info
                                    </label>
                                    <textarea 
                                        value={item.description}
                                        onChange={(e) => handlePriceUpdate(index, 'description', e.target.value)}
                                        rows={3}
                                        className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-gray-300 text-xs leading-relaxed focus:border-[#F6B45A] focus:outline-none transition-colors resize-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* --- SECTION 3: LIGHTING PREFERENCES --- */}
        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden mb-6 shadow-xl">
            <SectionHeader 
                icon={Lightbulb} 
                title="Lighting Defaults" 
                subtitle="Configure default realism settings"
                isOpen={activeSection === 'lighting'}
                onToggle={() => setActiveSection(activeSection === 'lighting' ? null : 'lighting')}
            />
            
            {activeSection === 'lighting' && (
                <div className="p-6 md:p-8 animate-in slide-in-from-top-4 duration-300">
                     <div className="mb-6">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-300 block mb-4">Default Color Temperature</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {COLOR_TEMPERATURES.slice(0, 4).map((temp) => (
                                <button
                                    key={temp.id}
                                    onClick={() => onColorTempChange?.(temp.id)}
                                    className={`relative p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                        colorTemp === temp.id 
                                        ? 'bg-[#F6B45A]/10 border-[#F6B45A] shadow-[0_0_15px_rgba(246,180,90,0.1)]' 
                                        : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <div 
                                        className="w-6 h-6 rounded-full shadow-inner border border-white/10" 
                                        style={{ backgroundColor: temp.color }}
                                    ></div>
                                    <span className={`text-[10px] font-bold uppercase ${colorTemp === temp.id ? 'text-[#F6B45A]' : 'text-gray-400'}`}>
                                        {temp.kelvin}
                                    </span>
                                    {colorTemp === temp.id && (
                                        <div className="absolute top-2 right-2 text-[#F6B45A]">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                     </div>
                </div>
            )}
        </div>

        {/* --- AI ASSISTANT WIDGET --- */}
        <div className="mt-12 bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
             <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#111] to-[#1a1a1a]">
                 <div className="flex items-center gap-4">
                     <div className="p-3 bg-[#F6B45A]/20 rounded-xl">
                        <MessageCircle className="w-6 h-6 text-[#F6B45A]" />
                     </div>
                     <div>
                        <h3 className="font-bold text-white text-lg font-serif">Omnia AI Consultant</h3>
                        <p className="text-xs text-gray-300">Ask questions about pricing, app usage, or design tips.</p>
                     </div>
                 </div>
             </div>
             
             {activeSection === 'ai' ? (
                 <div className="p-6 animate-in fade-in slide-in-from-bottom-4">
                     <AIAssistant onClose={() => setActiveSection(null)} />
                 </div>
             ) : (
                 <div className="p-6">
                     <button 
                        onClick={() => setActiveSection('ai')}
                        className="w-full py-4 rounded-xl border border-dashed border-[#F6B45A]/30 text-[#F6B45A] font-bold uppercase tracking-widest hover:bg-[#F6B45A]/10 transition-all flex items-center justify-center gap-2"
                     >
                        <Sparkles className="w-4 h-4" />
                        Open Assistant Interface
                     </button>
                 </div>
             )}
        </div>

      </div>
    </div>
  );
};