import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, ChevronDown, ChevronUp, Upload, Check, Sliders, Building, DollarSign, Lightbulb, Save, LogOut, MapPin, X, Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { COLOR_TEMPERATURES, DEFAULT_PRICING } from '../constants';
import { FixturePricing, CompanyProfile } from '../types';

interface SettingsViewProps {
  profile?: CompanyProfile;
  onProfileChange?: (profile: CompanyProfile) => void;
  colorTemp?: string;
  onColorTempChange?: (tempId: string) => void;
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
    onClick={onToggle}
    className={`flex items-center justify-between p-6 cursor-pointer transition-all duration-300 border-b border-white/5 ${isOpen ? 'bg-white/5' : 'hover:bg-white/5'}`}
  >
    <div className="flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#F6B45A] text-black shadow-[0_0_15px_rgba(246,180,90,0.4)]' : 'bg-[#1a1a1a] text-gray-400'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className={`text-lg font-bold font-serif tracking-wide ${isOpen ? 'text-white' : 'text-gray-300'}`}>{title}</h3>
        <p className="text-xs text-gray-400 font-mono uppercase tracking-wider mt-1">{subtitle}</p>
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
        config: { systemInstruction }
      });

      // Replay history to context (simplified for this ephemeral session)
      const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));
      
      const response = await chat.sendMessage({ message: userMsg });
      
      if (response.text) {
          setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "I apologize, but I am unable to connect to the neural network at this moment. Please check your API Key." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:justify-end pointer-events-none p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="pointer-events-auto w-full sm:w-[400px] bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] sm:h-[600px] animate-in slide-in-from-right-10 fade-in duration-300 relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-[#111] flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[#F6B45A]/10 flex items-center justify-center border border-[#F6B45A]/20">
                <Sparkles className="w-4 h-4 text-[#F6B45A]" />
             </div>
             <div>
                <h3 className="text-sm font-bold text-white font-serif tracking-wide">Omnia Assistant</h3>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-gray-400 font-mono uppercase">System Online</span>
                </span>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
           {messages.map((msg, idx) => (
             <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                    <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-1 border border-white/10">
                        <Bot className="w-3 h-3 text-[#F6B45A]" />
                    </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-[#F6B45A] text-[#111] font-medium rounded-tr-none' 
                    : 'bg-[#1a1a1a] text-gray-200 border border-white/5 rounded-tl-none'
                }`}>
                    {msg.text}
                </div>
                {msg.role === 'user' && (
                     <div className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center shrink-0 mt-1 border border-white/10">
                        <UserIcon className="w-3 h-3 text-gray-400" />
                    </div>
                )}
             </div>
           ))}
           {isTyping && (
             <div className="flex gap-3 justify-start">
                 <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-1 border border-white/10">
                    <Bot className="w-3 h-3 text-[#F6B45A]" />
                </div>
                <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-[#111] border-t border-white/10">
            <div className="relative">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about features, pricing, or design..."
                    className="w-full bg-[#050505] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-[#F6B45A]/50 focus:ring-1 focus:ring-[#F6B45A]/50 font-medium placeholder-gray-500"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="absolute right-2 top-2 p-1.5 bg-[#F6B45A] text-[#111] rounded-lg hover:bg-[#ffc67a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

// --- MAIN SETTINGS VIEW ---

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  profile = { name: '', email: '', address: '', logo: null },
  onProfileChange = () => {},
  colorTemp = '3000k',
  onColorTempChange = () => {},
}) => {
  // Section Open State - Single active section
  const [activeSection, setActiveSection] = useState<string | null>('lighting');
  const [showAssistant, setShowAssistant] = useState(false);

  const toggleSection = (section: string) => {
    setActiveSection(prev => (prev === section ? null : section));
  };

  const [sliders, setSliders] = useState({ ambient: 20, intensity: 80, contrast: 60 });
  const [toggles, setToggles] = useState({ darkSky: true, preserve: true, highRealism: true, ultraRes: true });

  // Pricing State
  const [pricing, setPricing] = useState<FixturePricing[]>(DEFAULT_PRICING);

  // Defaults State
  const [defaults, setDefaults] = useState({
    template: 'none'
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        onProfileChange({ ...profile, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-[60%] h-[500px] bg-[#F6B45A]/5 blur-[120px] rounded-full pointer-events-none"></div>

      {showAssistant && <AIAssistant onClose={() => setShowAssistant(false)} />}

      {/* Header */}
      <div className="px-6 md:px-12 py-8 max-w-5xl mx-auto w-full flex items-center justify-between shrink-0 relative z-10 border-b border-white/5 pb-8 mb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white font-serif tracking-tight mb-2">Settings</h1>
          <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">System Configuration & Preferences</p>
        </div>
        <div className="flex flex-col items-center gap-2">
           <button 
             onClick={() => setShowAssistant(true)}
             className="w-12 h-12 bg-[#1a1a1a] rounded-full flex items-center justify-center text-[#F6B45A] hover:bg-[#F6B45A] hover:text-[#111] transition-all shadow-[0_0_15px_rgba(246,180,90,0.2)] hover:shadow-[0_0_25px_rgba(246,180,90,0.6)] group border border-white/10"
             title="Open AI Assistant"
           >
             <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
           </button>
           <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">AI Support</span>
        </div>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-20 relative z-10">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* SECTION 1: Lighting Configuration */}
          <div className="bg-[#111]/90 backdrop-blur-md rounded-[24px] shadow-2xl border border-white/10 overflow-hidden">
            <SectionHeader 
              icon={Sliders} 
              title="Lighting Engine" 
              subtitle="Realism & Render Settings"
              isOpen={activeSection === 'lighting'}
              onToggle={() => toggleSection('lighting')}
            />
            
            {activeSection === 'lighting' && (
              <div className="px-6 pb-8 md:px-8 md:pb-10 animate-in slide-in-from-top-2 duration-300">
                
                {/* Color Temp Selector */}
                <div className="mb-10">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-5">Output Color Temperature</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {COLOR_TEMPERATURES.map((temp) => (
                      <button
                        key={temp.id}
                        onClick={() => onColorTempChange(temp.id)}
                        className={`group relative flex flex-col items-center justify-center py-5 rounded-2xl border transition-all duration-300 ${
                          colorTemp === temp.id 
                            ? 'border-[#F6B45A] bg-[#F6B45A]/10 shadow-[0_0_20px_rgba(246,180,90,0.1)]' 
                            : 'border-white/5 bg-black/40 hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="w-3 h-3 rounded-full mb-3 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: temp.color, color: temp.color }}></div>
                        <span className={`font-bold text-sm font-serif ${colorTemp === temp.id ? 'text-[#F6B45A]' : 'text-gray-300'}`}>{temp.kelvin}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{temp.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <div className="space-y-8 mb-12 bg-black/20 p-6 rounded-2xl border border-white/5">
                  {[
                    { label: 'Ambient Light (Time of Day)', key: 'ambient' },
                    { label: 'Fixture Intensity', key: 'intensity' },
                    { label: 'Shadow Contrast', key: 'contrast' },
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{item.label}</label>
                        <span className="text-xs font-mono font-bold text-[#F6B45A]">{(sliders as any)[item.key]}%</span>
                      </div>
                      <div className="relative h-1.5 bg-[#222] rounded-full">
                         <div 
                            className="absolute top-0 left-0 h-full bg-[#F6B45A] rounded-full shadow-[0_0_10px_rgba(246,180,90,0.5)]" 
                            style={{ width: `${(sliders as any)[item.key]}%` }}
                         />
                         <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={(sliders as any)[item.key]}
                            onChange={(e) => setSliders({ ...sliders, [item.key]: parseInt(e.target.value) })}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-sm font-bold text-gray-200">Dark Sky Mode</span>
                    <Toggle checked={toggles.darkSky} onChange={(v) => setToggles({...toggles, darkSky: v})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-sm font-bold text-gray-200">Preserve Non-Lit Areas</span>
                    <Toggle checked={toggles.preserve} onChange={(v) => setToggles({...toggles, preserve: v})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-sm font-bold text-gray-200">High Realism Engine</span>
                    <Toggle checked={toggles.highRealism} onChange={(v) => setToggles({...toggles, highRealism: v})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-sm font-bold text-gray-200">Ultra Resolution (4K)</span>
                    <Toggle checked={toggles.ultraRes} onChange={(v) => setToggles({...toggles, ultraRes: v})} />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* SECTION 2: Company Profile */}
          <div className="bg-[#111]/90 backdrop-blur-md rounded-[24px] shadow-2xl border border-white/10 overflow-hidden">
            <SectionHeader 
              icon={Building} 
              title="Company Identity" 
              subtitle="Branding & Contact Info"
              isOpen={activeSection === 'profile'}
              onToggle={() => toggleSection('profile')}
            />
             {activeSection === 'profile' && (
              <div className="px-6 pb-8 md:px-8 md:pb-10 flex flex-col md:flex-row gap-8 md:gap-12 animate-in slide-in-from-top-2 duration-300">
                  {/* Logo Upload */}
                  <div className="w-full md:w-1/3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-4">Company Logo</label>
                    <div className="relative aspect-square rounded-2xl border border-dashed border-white/20 bg-black/40 flex flex-col items-center justify-center cursor-pointer hover:border-[#F6B45A] hover:bg-[#F6B45A]/5 transition-all group overflow-hidden">
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        {profile.logo ? (
                          <img src={profile.logo} alt="Company Logo" className="w-full h-full object-contain p-4" />
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-[#222] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-white/10">
                                <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#F6B45A]" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-300 uppercase tracking-widest">Upload Logo</span>
                          </>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-3 text-center">Recommended: 400x400 PNG (Transparent)</p>
                  </div>

                  {/* Form Fields */}
                  <div className="w-full md:w-2/3 space-y-6">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">Company Name</label>
                        <input 
                            type="text" 
                            value={profile.name} 
                            onChange={(e) => onProfileChange({...profile, name: e.target.value})}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-[#F6B45A] transition-all placeholder-gray-500"
                            placeholder="Enter your company name"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2 flex gap-2 items-center">Account Email</label>
                        <div className="relative">
                            <input 
                                type="email" 
                                value={profile.email} 
                                onChange={(e) => onProfileChange({...profile, email: e.target.value})}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-[#F6B45A] transition-all placeholder-gray-500"
                            />
                            <div className="absolute right-3 top-3 text-[#F6B45A]">
                                <Check className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                     <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2 flex gap-2 items-center">Company Address</label>
                        <textarea
                            value={profile.address}
                            onChange={(e) => onProfileChange({...profile, address: e.target.value})}
                            rows={3}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-[#F6B45A] transition-all placeholder-gray-500 resize-none leading-relaxed"
                            placeholder="Street Address, City, State, Zip"
                        />
                    </div>
                  </div>
              </div>
             )}
          </div>

          {/* SECTION 3: Company Pricing */}
          <div className="bg-[#111]/90 backdrop-blur-md rounded-[24px] shadow-2xl border border-white/10 overflow-hidden">
            <SectionHeader 
              icon={DollarSign} 
              title="Pricing Database" 
              subtitle="Unit Costs & SKU Management"
              isOpen={activeSection === 'pricing'}
              onToggle={() => toggleSection('pricing')}
            />
            {activeSection === 'pricing' && (
                <div className="px-6 pb-8 md:px-8 md:pb-10 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    {pricing.map((item, index) => (
                        <div key={item.id} className="border border-white/5 rounded-xl p-4 md:p-6 bg-black/40 hover:bg-black/60 hover:border-white/10 transition-all group">
                            <div className="mb-4">
                                <span className="inline-block bg-[#F6B45A]/10 text-[#F6B45A] border border-[#F6B45A]/20 text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-3">
                                    {item.fixtureType}
                                </span>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Display Name</label>
                                        <input 
                                            type="text" 
                                            value={item.name}
                                            onChange={(e) => {
                                                const newPricing = [...pricing];
                                                newPricing[index].name = e.target.value;
                                                setPricing(newPricing);
                                            }}
                                            className="w-full bg-transparent border-b border-white/10 focus:border-[#F6B45A] px-0 py-2 text-sm font-bold text-gray-200 focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="w-full md:w-32">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Unit Price</label>
                                        <div className="relative">
                                            <span className="absolute left-0 top-2 text-gray-400 text-sm font-bold">$</span>
                                            <input 
                                                type="number" 
                                                value={item.unitPrice}
                                                onChange={(e) => {
                                                    const newPricing = [...pricing];
                                                    newPricing[index].unitPrice = parseFloat(e.target.value) || 0;
                                                    setPricing(newPricing);
                                                }}
                                                className="w-full bg-transparent border-b border-white/10 focus:border-[#F6B45A] pl-4 pr-0 py-2 text-sm font-mono font-bold text-[#F6B45A] focus:outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Product Details</label>
                                <textarea 
                                    rows={2}
                                    value={item.description}
                                    onChange={(e) => {
                                        const newPricing = [...pricing];
                                        newPricing[index].description = e.target.value;
                                        setPricing(newPricing);
                                    }}
                                    className="w-full bg-[#0a0a0a] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#F6B45A]/50 resize-none font-mono"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* SECTION 4: Design Defaults */}
          <div className="bg-[#111]/90 backdrop-blur-md rounded-[24px] shadow-2xl border border-white/10 overflow-hidden mb-12">
            <SectionHeader 
              icon={Lightbulb} 
              title="Global Defaults" 
              subtitle="Startup Configuration"
              isOpen={activeSection === 'defaults'}
              onToggle={() => toggleSection('defaults')}
            />
            {activeSection === 'defaults' && (
                <div className="px-6 pb-8 md:px-8 md:pb-10 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">Default Design Template</label>
                        <div className="relative">
                             <select 
                                value={defaults.template}
                                onChange={(e) => setDefaults({...defaults, template: e.target.value})}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-200 appearance-none focus:outline-none focus:border-[#F6B45A]"
                            >
                                <option value="none">None (Empty Notes)</option>
                                <option value="basic">Basic Package</option>
                                <option value="premium">Premium Estate</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col items-center gap-6 pb-12">
            <button className="bg-[#F6B45A] text-[#111] px-10 py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 hover:shadow-[0_0_25px_rgba(246,180,90,0.4)] transition-all">
                <Save className="w-4 h-4" />
                Save System Config
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100">
                <LogOut className="w-4 h-4" />
                End Session
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};