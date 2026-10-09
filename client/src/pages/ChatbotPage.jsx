import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import ChatbotWindow from '../components/ChatbotWindow';
import { Camera, Sun, Focus, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ChatbotPage() {
  const { t, language } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Chatbot Window */}
        <div className="lg:col-span-8">
          <ChatbotWindow compact={false} />
        </div>

        {/* Photography & Diagnosis Tips Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-gradient-to-br from-agro-50 to-white rounded-2xl border border-agro-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-agro-600" />
              <span>Tips for Accurate Leaf Diagnosis</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">Natural Daylight:</strong>
                  Take photo outdoors in clear daylight. Avoid harsh shadows or dark flash.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Focus className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">Focus on the Leaf Spot:</strong>
                  Capture both healthy and diseased parts of the leaf for comparison.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">Multilingual Advice:</strong>
                  Select your preferred language in the top corner to get remedies in Telugu, Kannada, Hindi, or English.
                </div>
              </div>
            </div>
          </div>

          {/* Guaranteed Solutions Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
              Supported Crop Problems
            </h4>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-agro-600 shrink-0" />
                <span>Early & Late Blight (ఆకు మచ్చల తెగులు)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-agro-600 shrink-0" />
                <span>Powdery & Downy Mildew (బూడిద తెగులు)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-agro-600 shrink-0" />
                <span>Leaf Curl & Gemini Virus (ఆకు ముడత)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-agro-600 shrink-0" />
                <span>Nitrogen & Zinc Deficiency (నత్రజని / జింక్ లోపం)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
