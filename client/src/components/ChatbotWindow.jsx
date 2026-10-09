import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { diagnoseCropWithPhoto, sendChatMessage } from '../services/api';
import {
  Send,
  Upload,
  Bot,
  User,
  ShoppingCart,
  Sparkles,
  X,
  RefreshCw,
  Globe,
  Leaf,
  FlaskConical,
  Percent,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function ChatbotWindow({ initialPrompt = '', compact = false }) {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { addToCart } = useCart();

  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: t.chatbot.subtitle,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isWelcome: true
    }
  ]);

  const [inputText, setInputText] = useState(initialPrompt || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText !== null ? overrideText : inputText;
    if (!textToSend.trim() && !selectedFile) return;

    const userMessageId = 'msg-' + Date.now();
    const currentPreview = previewUrl;
    const currentFile = selectedFile;

    // Add user message to stream
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        sender: 'user',
        text: textToSend,
        image: currentPreview,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    setInputText('');
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLoading(true);

    try {
      let res;
      if (currentFile) {
        res = await diagnoseCropWithPhoto(currentFile, textToSend, language);
      } else {
        res = await sendChatMessage(textToSend, language);
      }

      if (res && res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            diagnosis: res.diagnosis,
            message: res.message,
            recommendedProducts: res.recommendedProducts || [],
            engine: res.engine,
            imageUrl: res.imageUrl,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-err-' + Date.now(),
            sender: 'bot',
            text: 'I could not process your request at this moment. Please try again or inspect your leaf picture.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          sender: 'bot',
          text: 'Error connecting to the Kisan AI diagnostic server. Make sure the backend server is running.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const currentLangObj = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-md flex flex-col ${compact ? 'h-[600px]' : 'h-[750px] max-h-[85vh]'}`}>
      {/* Chatbot Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-agro-800 to-agro-700 text-white rounded-t-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs text-agro-200">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base leading-tight flex items-center gap-2">
              {t.chatbot.title}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-agro-500/30 text-agro-100 border border-agro-400/30">
                <Sparkles className="w-3 h-3 mr-1 text-amber-300" /> Dual-Action
              </span>
            </h3>
            <p className="text-xs text-agro-100/90 hidden sm:block">
              {t.chatbot.subtitle}
            </p>
          </div>
        </div>

        {/* Quick Language Switcher inside Chat */}
        <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-xl text-xs">
          <Globe className="w-3.5 h-3.5 text-agro-200" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
          >
            {supportedLanguages.map((l) => (
              <option key={l.code} value={l.code} className="text-slate-900 bg-white">
                {l.native} ({l.code.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 sm:gap-3 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-agro-100 border border-agro-300 flex items-center justify-center text-agro-700 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-agro-600 text-white rounded-tr-xs'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
              }`}
            >
              {/* Image sent by user */}
              {msg.image && (
                <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 max-w-xs max-h-56">
                  <img src={msg.image} alt="Crop sample" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Simple Text Message */}
              {msg.text && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              )}

              {/* Welcome message prompt pills */}
              {msg.isWelcome && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    💡 Sample queries:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.chatbot.sampleQueries.map((query, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(query)}
                        className="text-xs bg-agro-50 hover:bg-agro-100 text-agro-800 border border-agro-200 px-2.5 py-1 rounded-lg transition text-left"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rich Dual-Action Diagnosis Output */}
              {msg.diagnosis && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-agro-700 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-agro-600" />
                      {t.chatbot.diagnosisBadge}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        msg.diagnosis.severity?.toLowerCase().includes('high')
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {t.chatbot.severity}: {msg.diagnosis.severity}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 text-agro-900">
                      {msg.diagnosis.diseaseName}
                    </h4>
                  </div>

                  {msg.diagnosis.symptoms && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <span className="font-bold text-slate-700 block mb-0.5">
                        🔍 {t.chatbot.symptoms}:
                      </span>
                      <p className="text-slate-600 leading-relaxed">
                        {msg.diagnosis.symptoms}
                      </p>
                    </div>
                  )}

                  {/* SOLUTION 1: Organic Solution / Home Remedy */}
                  <div className="bg-emerald-50/90 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                      <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{t.chatbot.organicTitle}</span>
                    </div>
                    <p className="text-emerald-900/90 leading-relaxed font-medium">
                      {msg.diagnosis.organicRemedy || msg.diagnosis.treatment}
                    </p>
                  </div>

                  {/* SOLUTION 2: Shop Fertilizer & Percentage Concentration */}
                  <div className="bg-blue-50/90 p-3.5 rounded-xl border border-blue-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs uppercase tracking-wide">
                      <FlaskConical className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{t.chatbot.shopTitle}</span>
                    </div>
                    <p className="text-blue-900 font-semibold leading-relaxed">
                      {msg.diagnosis.shopTreatment || msg.diagnosis.treatment}
                    </p>

                    {/* Exact Percentage / Concentration Badge */}
                    {msg.diagnosis.dosagePercentage && (
                      <div className="bg-white p-2.5 rounded-lg border border-blue-300 shadow-2xs flex items-start gap-2">
                        <Percent className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 text-[11px] block">
                            {t.chatbot.dosageTitle}:
                          </span>
                          <span className="text-blue-700 font-extrabold text-xs">
                            {msg.diagnosis.dosagePercentage}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recommended Products Carousel / List */}
                  {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5 text-agro-600" />
                          {t.chatbot.recommendedHeader}:
                        </h5>
                        <Link
                          to="/shop"
                          className="text-[11px] font-bold text-agro-600 hover:text-agro-700 hover:underline flex items-center gap-0.5"
                        >
                          <span>{t.chatbot.viewMoreShop}</span>
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msg.recommendedProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs hover:border-agro-400 transition"
                          >
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h6 className="text-xs font-bold text-slate-900 truncate">
                                {prod.name}
                              </h6>
                              <div className="text-[11px] text-slate-500">
                                {prod.weight}
                              </div>
                              <div className="text-xs font-black text-slate-800 mt-0.5">
                                ₹{prod.price}
                              </div>
                              <button
                                onClick={() => addToCart(prod)}
                                className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 bg-agro-600 hover:bg-agro-700 text-white rounded-lg text-[10px] font-bold shadow-xs active:scale-95 transition"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>{t.chatbot.addToCart}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div
                className={`text-[10px] mt-1.5 text-right ${
                  msg.sender === 'user' ? 'text-agro-200' : 'text-slate-400'
                }`}
              >
                {msg.time}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-agro-100 border border-agro-300 flex items-center justify-center text-agro-700 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-xs flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-agro-600 animate-spin" />
              <div className="text-xs text-slate-600 font-medium">
                {t.chatbot.analyzing} ({currentLangObj.native})
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Preview Floating Bar */}
      {previewUrl && (
        <div className="px-4 py-2 bg-agro-50 border-t border-agro-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={previewUrl}
              alt="Leaf to upload"
              className="w-10 h-10 rounded-lg object-cover border border-agro-300"
            />
            <div>
              <span className="text-xs font-bold text-agro-900 block">
                {t.chatbot.photoSelected}
              </span>
              <span className="text-[10px] text-agro-700">
                {selectedFile?.name}
              </span>
            </div>
          </div>
          <button
            onClick={removeSelectedFile}
            className="p-1 hover:bg-agro-200 text-agro-700 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input & Upload Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 rounded-b-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            id="leaf-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-500 hover:text-agro-600 hover:bg-agro-50 border border-slate-300 rounded-xl transition shrink-0"
            title="Upload leaf photo"
          >
            <Upload className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={selectedFile ? `Add details about this leaf photo...` : t.chatbot.askPlaceholder}
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-agro-500 focus:bg-white transition"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || (!inputText.trim() && !selectedFile)}
            className="px-4 py-2.5 bg-agro-600 hover:bg-agro-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{t.chatbot.sendBtn}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
