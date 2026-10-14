import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { insertDiagnosisStmt, getDiagnosisByUserStmt, getDiagnosisCountByUserStmt } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load data
const productsPath = path.join(__dirname, '../data/products.json');
const diseasesPath = path.join(__dirname, '../data/localizedDiseases.json');

const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
const diseases = JSON.parse(fs.readFileSync(diseasesPath, 'utf-8'));

const DOSAGE_DISCLAIMER = {
  en: '⚠️ Standard reference dosage. Confirm with your local Krishi Vigyan Kendra (KVK) or agricultural extension officer before field application.',
  te: '⚠️ ఇది ప్రామాణిక సూచన మోతాదు మాత్రమే. పిచికారీ చేయడానికి ముందు మీ స్థానిక కృషి విజ్ఞాన కేంద్రం (KVK) లేదా వ్యవసాయ అధికారిని సంప్రదించి నిర్ధారించుకోండి.',
  kn: '⚠️ ಇದು ಪ್ರಮಾಣಿತ ಉಲ್ಲೇಖದ ಪ್ರಮಾಣ ಮಾತ್ರ. ಸಿಂಪಡಿಸುವ ಮೊದಲು ನಿಮ್ಮ ಸ್ಥಳೀಯ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ (KVK) ಅಥವಾ ಕೃಷಿ ಅಧಿಕಾರಿಯೊಂದಿಗೆ ದೃಢೀಕರಿಸಿ.',
  hi: '⚠️ यह मानक संदर्भ खुराक है। खेत में छिड़काव करने से पहले अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि अधिकारी से सलाह अवश्य लें।'
};

/**
 * Helper to match product objects by IDs
 */
function getRecommendedProducts(productIds = []) {
  return products.filter((p) => productIds.includes(p.id));
}

/**
 * Basic Symptom Matcher (Local Rule-Based Engine)
 * Replaces fake confidence with honest diagnostic feedback.
 */
export function runOfflineDiagnosis(queryText = '', filename = '', lang = 'en') {
  const normalizedQuery = (queryText || '').toLowerCase();
  const normalizedFile = (filename || '').toLowerCase();
  const validLang = ['en', 'te', 'kn', 'hi'].includes(lang) ? lang : 'en';

  // Find best matching disease based on registered keywords
  let matched = diseases.find((d) => {
    return d.keywords.some((kw) => {
      const lowerKw = kw.toLowerCase();
      return normalizedQuery.includes(lowerKw) || normalizedFile.includes(lowerKw);
    });
  });

  // Targeted symptom fallback
  if (!matched) {
    if (normalizedQuery.includes('yellow') || normalizedQuery.includes('పసుపు') || normalizedQuery.includes('ಹಳದಿ') || normalizedQuery.includes('पीला')) {
      matched = diseases.find((d) => d.id === 'nitrogen_deficiency');
    } else if (normalizedQuery.includes('powder') || normalizedQuery.includes('white') || normalizedQuery.includes('బూడిద') || normalizedQuery.includes('ಬೂದಿ') || normalizedQuery.includes('सफेद')) {
      matched = diseases.find((d) => d.id === 'powdery_mildew');
    } else if (normalizedQuery.includes('curl') || normalizedQuery.includes('ముడత') || normalizedQuery.includes('ಮುದುರು') || normalizedQuery.includes('मुड़')) {
      matched = diseases.find((d) => d.id === 'leaf_curl_virus');
    } else if (normalizedQuery.includes('zinc') || normalizedQuery.includes('జింక్') || normalizedQuery.includes('వరి') || normalizedQuery.includes('paddy') || normalizedQuery.includes('धान')) {
      matched = diseases.find((d) => d.id === 'zinc_deficiency');
    }
  }

  // If no match could be identified honestly, DO NOT return Early Blight with fake confidence!
  if (!matched) {
    const noMatchMessages = {
      en: `I couldn't identify a matching crop disease with certainty from the symptoms provided.\n\nTo help pinpoint the diagnosis, could you clarify:\n1. Which crop is affected (e.g., Tomato, Paddy, Chili)?\n2. Where are the symptoms located (older bottom leaves, new upper leaves, or stems)?\n3. Do you see leaf spots, powdery deposits, yellowing, or leaf curl?`,
      te: `మీరు తెలిపిన లక్షణాలతో నిర్దిష్ట పంట తెగులును ఖచ్చితంగా గుర్తించలేకపోయాను.\n\nసమస్యను స్పష్టంగా తెలుసుకోవడానికి దయచేసి ఈ వివరాలు తెలపండి:\n1. ఏ పంటను సాగు చేస్తున్నారు (ఉదా: టమోటా, వరి, మిర్చి)?\n2. తెగులు పాత ఆకులపై ఉందా లేదా పై లేత చిగుళ్ళపై ఉందా?\n3. మచ్చలు, బూడిద పూత, పసుపు రంగు లేదా ఆకులు ముడుచుకుపోవడం వంటి వాటిలో ఏది గమనించారు?`,
      kn: `ನೀವು ನೀಡಿರುವ ಲಕ್ಷಣಗಳೊಂದಿಗೆ ನಿಖರವಾದ ರೋಗವನ್ನು ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.\n\nಸಮಸ್ಯೆಯನ್ನು ತಿಳಿಯಲು ದಯವಿಟ್ಟು ಈ ವಿವರಗಳನ್ನು ನೀಡಿ:\n1. ಯಾವ ಬೆಳೆ ಬೆಳೆಯುತ್ತಿದ್ದೀರಿ (ಉದಾ: ಟೊಮೆಟೊ, ಭತ್ತ, ಮೆಣಸಿನಕಾಯಿ)?\n2. ರೋಗದ ಲಕ್ಷಣಗಳು ಹಳೆಯ ಕೆಳ ಎಲೆಗಳ ಮೇಲಿದೆಯೇ ಅಥವಾ ಮೇಲಿನ ಹೊಸ ಚಿಗುರುಗಳಲ್ಲಿದೆಯೇ?\n3. ಎಲೆ ಚುಕ್ಕೆಗಳು, ಬೂದಿ ಲೇಪನ, ಹಳದಿ ಬಣ್ಣ ಅಥವಾ ಎಲೆ ಮುದುರಿಕೊಳ್ಳುವಿಕೆ ಇದೆಯೇ?`,
      hi: `बताए गए लक्षणों से किसी निश्चित फसल रोग की पुष्टि नहीं हो सकी।\n\nसटीक पहचान के लिए कृपया निम्न विवरण दें:\n1. आप कौन सी फसल उगा रहे हैं (जैसे: टमाटर, धान, मिर्च)?\n2. लक्षण पौधे की निचली पुरानी पत्तियों पर हैं या नई शाखाओं पर?\n3. क्या पत्तियों पर काले/भूरे धब्बे, सफेद चूर्ण, पीलापन या पत्तियां मुड़ना दिख रहा है?`
    };

    return {
      success: true,
      matched: false,
      engine: 'Basic Symptom Matcher (Local Rule-Based)',
      language: validLang,
      diagnosis: null,
      message: noMatchMessages[validLang] || noMatchMessages.en,
      disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
      followUpQuestions: [
        validLang === 'te' ? 'పంట పేరు ఏమిటి?' : validLang === 'hi' ? 'फसल का नाम क्या है?' : validLang === 'kn' ? 'ಬೆಳೆಯ ಹೆಸರು ಏನು?' : 'What is the crop name?',
        validLang === 'te' ? 'ఆకులపై మచ్చలా లేక బూడిదా?' : validLang === 'hi' ? 'धब्बे हैं या सफेद पाउडर?' : validLang === 'kn' ? 'ಚುಕ್ಕೆಗಳೇ ಅಥವಾ ಬೂದಿಯೇ?' : 'Are there spots, powder, or curl?',
        validLang === 'te' ? 'తెగులు ఎప్పుడు మొదలైంది?' : validLang === 'hi' ? 'रोग कब शुरू हुआ?' : validLang === 'kn' ? 'ರೋಗ ಯಾವಾಗ ಆರಂಭವಾಯಿತು?' : 'When did symptoms start?'
      ],
      recommendedProducts: []
    };
  }

  // Matched localized strings
  const localizedName = matched.name[validLang] || matched.name.en;
  const localizedSymptoms = matched.symptoms[validLang] || matched.symptoms.en;
  const localizedCauses = matched.causes[validLang] || matched.causes.en;
  const localizedOrganic = matched.organicRemedy[validLang] || matched.organicRemedy.en;
  const localizedShop = matched.shopTreatment[validLang] || matched.shopTreatment.en;
  const localizedDosage = matched.dosagePercentage[validLang] || matched.dosagePercentage.en;

  const matchedProducts = getRecommendedProducts(matched.recommendedProductIds);

  const greetingByLang = {
    en: `Hello farmer! Based on the symptoms described, here is the dual-action recommendation:`,
    te: `నమస్కారం రైతు సోదరా! మీరు తెలిపిన పంట లక్షణాల ప్రకారం రూపొందించిన 2 రకాల పరిష్కారాలు:`,
    kn: `ನಮಸ್ಕಾರ ರೈತ ಮಿತ್ರರೇ! ನಿಮ್ಮ ಬೆಳೆ ರೋಗಕ್ಕೆ 2 ಹಂತದ ಪರಿಹಾರ ಇಲ್ಲಿದೆ:`,
    hi: `नमस्ते किसान भाई! फसल के लक्षणों के आधार पर 2-चरणीय समाधान:`
  };

  const organicLabel = {
    en: '🌿 1. Organic Solution / Home Remedy',
    te: '🌿 1. సేంద్రీయ ఇంటి చిట్కా (Organic Remedy)',
    kn: '🌿 1. ಸಾವಯವ ಮನೆಮದ್ದು (Organic Remedy)',
    hi: '🌿 1. जैविक घरेलू उपाय (Organic Remedy)'
  };

  const shopLabel = {
    en: '🧪 2. Shop Treatment & Certified Fertilizer',
    te: '🧪 2. దుకాణ ఎరువు & రసాయన మందు (Shop Treatment)',
    kn: '🧪 2. ಅಂಗಡಿ ಗೊಬ್ಬರ & ಔಷಧ (Shop Treatment)',
    hi: '🧪 2. दुकान की प्रमाणित खाद व दवा (Shop Treatment)'
  };

  const dosageLabel = {
    en: 'Recommended Dosage & Dilution Rate',
    te: 'వాడవలసిన మోతాదు & శాతం',
    kn: 'ಬಳಕೆಯ ಪ್ರಮಾಣ & ಶೇಕಡಾವಾರು',
    hi: 'उपयोग की मात्रा और प्रतिशत'
  };

  return {
    success: true,
    matched: true,
    engine: 'Basic Symptom Matcher (Local Rule-Based)',
    language: validLang,
    diagnosis: {
      diseaseId: matched.id,
      diseaseName: localizedName,
      severity: matched.severity,
      symptoms: localizedSymptoms,
      causes: localizedCauses,
      organicRemedy: localizedOrganic,
      shopTreatment: localizedShop,
      dosagePercentage: localizedDosage,
      suitableCrops: matched.commonCrops
    },
    message: `${greetingByLang[validLang] || greetingByLang.en}\n\n**${localizedName}**\n\n${organicLabel[validLang] || organicLabel.en}:\n${localizedOrganic}\n\n${shopLabel[validLang] || shopLabel.en}:\n${localizedShop}\n\n👉 **${dosageLabel[validLang] || dosageLabel.en}:** ${localizedDosage}`,
    disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
    recommendedProducts: matchedProducts
  };
}

/**
 * Handle plant disease diagnosis via photo upload or text inquiry
 */
export async function diagnoseCrop(req, res) {
  try {
    const { message = '', language = 'en' } = req.body;
    const file = req.file;

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    // If Gemini API Key is provided and an image was uploaded, run live multimodal AI vision
    if (apiKey && file) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const imageBuffer = fs.readFileSync(file.path);
        const imagePart = {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: file.mimetype
          }
        };

        const targetLangName =
          language === 'te' ? 'Telugu (తెలుగు)' :
          language === 'kn' ? 'Kannada (ಕನ್ನಡ)' :
          language === 'hi' ? 'Hindi (हिंदी)' : 'English';

        const prompt = `You are an expert agricultural scientist and plant pathologist at an agricultural center in India.
Analyze this uploaded crop leaf photo.
CRITICAL REQUIREMENTS:
1. Identify the disease or issue accurately. If the image is unclear or not a plant leaf, specify that politely.
2. Provide TWO distinct solutions:
   - "organicRemedy": natural home/organic recipe (e.g. neem oil, sour buttermilk, baking soda, bio-fungicides).
   - "shopTreatment": commercial fertilizer or fungicide.
   - "dosagePercentage": precise percentage concentration and dilution rate per liter of water.
3. Translate and output diseaseName, symptoms, organicRemedy, shopTreatment, and dosagePercentage in ${targetLangName} script!

Return response ONLY as valid JSON in this structure:
{
  "diseaseName": "...",
  "severity": "Low" | "Moderate" | "High",
  "symptoms": "...",
  "causes": "...",
  "organicRemedy": "...",
  "shopTreatment": "...",
  "dosagePercentage": "...",
  "recommendedProductKeywords": ["Copper", "Mancozeb", "NPK", "Zinc", "Sulphur", "Neem"]
}`;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          const matchedProducts = products.filter((p) => {
            const combined = `${p.name} ${p.description}`.toLowerCase();
            return (parsed.recommendedProductKeywords || []).some((kw) => combined.includes(kw.toLowerCase()));
          });

          const validLang = ['en', 'te', 'kn', 'hi'].includes(language) ? language : 'en';

          // Save to diagnosis history if user is authenticated
          if (req.user) {
            try {
              insertDiagnosisStmt.run({
                userId: req.user.id,
                diseaseId: 'gemini_vision',
                diseaseName: parsed.diseaseName || 'Crop Leaf Analysis',
                severity: parsed.severity || 'Moderate',
                imageUrl: `/uploads/${file.filename}`,
                queryText: message || 'Leaf image upload',
                language: validLang,
                createdAt: new Date().toISOString()
              });
            } catch (histErr) {
              console.warn('Failed to record diagnosis history:', histErr.message);
            }
          }

          return res.json({
            success: true,
            matched: true,
            engine: 'Gemini Multimodal Vision AI',
            model: modelName,
            language: validLang,
            imageUrl: `/uploads/${file.filename}`,
            diagnosis: {
              diseaseName: parsed.diseaseName,
              severity: parsed.severity,
              symptoms: parsed.symptoms,
              causes: parsed.causes,
              organicRemedy: parsed.organicRemedy,
              shopTreatment: parsed.shopTreatment,
              dosagePercentage: parsed.dosagePercentage
            },
            disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
            message: `🌿 1. Organic Remedy: ${parsed.organicRemedy}\n🧪 2. Shop Treatment: ${parsed.shopTreatment} (${parsed.dosagePercentage})`,
            recommendedProducts: matchedProducts.length > 0 ? matchedProducts : products.slice(0, 2)
          });
        }
      } catch (aiError) {
        console.warn('Gemini AI vision call failed, falling back to local rule-based matcher:', aiError.message);
      }
    }

    // Fallback to local rule-based matcher
    const result = runOfflineDiagnosis(message, file ? file.originalname : '', language);
    if (file) {
      result.imageUrl = `/uploads/${file.filename}`;
    }

    // Record in history if user is authenticated and diagnosis was matched
    if (req.user && result.matched && result.diagnosis) {
      try {
        insertDiagnosisStmt.run({
          userId: req.user.id,
          diseaseId: result.diagnosis.diseaseId || 'local_rule',
          diseaseName: result.diagnosis.diseaseName,
          severity: result.diagnosis.severity || 'Moderate',
          imageUrl: result.imageUrl || null,
          queryText: message || (file ? file.originalname : 'Crop query'),
          language: result.language,
          createdAt: new Date().toISOString()
        });
      } catch (histErr) {
        console.warn('Failed to record diagnosis history:', histErr.message);
      }
    }

    return res.json(result);
  } catch (error) {
    console.error('Diagnosis error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze crop condition. Please try again.'
    });
  }
}

/**
 * Handle conversational text chat
 * Connects to live Gemini if API key is present, otherwise uses local matcher.
 */
export async function chatMessage(req, res) {
  try {
    const { message = '', language = 'en' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const validLang = ['en', 'te', 'kn', 'hi'].includes(language) ? language : 'en';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    // If Gemini key is set, use live generative model for text queries
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const targetLangName =
          validLang === 'te' ? 'Telugu (తెలుగు)' :
          validLang === 'kn' ? 'Kannada (ಕನ್ನಡ)' :
          validLang === 'hi' ? 'Hindi (हिंदी)' : 'English';

        const prompt = `You are KisanAgro's expert crop scientist and agricultural extension officer.
The farmer is asking in ${targetLangName}: "${message}".

Provide a helpful, practical agricultural response in ${targetLangName} script.
If the inquiry is about a plant disease, nutrient deficiency, or pest:
- Give 1 organic home remedy
- Give 1 recommended shop fertilizer / fungicide
- Specify the dosage concentration percentage (e.g. 0.25% or grams per liter)
- Include a reminder to confirm dosage with their local Krishi Vigyan Kendra (KVK).
Keep the response structured, clear, and empathetic to a farmer.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return res.json({
          success: true,
          matched: true,
          engine: 'Gemini Generative AI',
          model: modelName,
          language: validLang,
          message: text,
          disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
          recommendedProducts: products.slice(0, 2)
        });
      } catch (geminiErr) {
        console.warn('Gemini chat error, falling back to local matcher:', geminiErr.message);
      }
    }

    // Fallback to local rule-based matcher
    const result = runOfflineDiagnosis(message, '', language);
    return res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ success: false, message: 'Chat service error. Please try again.' });
  }
}

/**
 * Get diagnosis history for authenticated user
 */
export function getDiagnosisHistory(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const history = getDiagnosisByUserStmt.all(req.user.id);
    const count = getDiagnosisCountByUserStmt.get(req.user.id);
    return res.json({ success: true, count: count.count, history });
  } catch (error) {
    console.error('Diagnosis history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve diagnosis history.' });
  }
}
