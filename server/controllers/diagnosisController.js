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

export const DOSAGE_DISCLAIMER = {
  en: '⚠️ Standard reference dosage. Confirm with your local Krishi Vigyan Kendra (KVK) or agricultural extension officer before field application.',
  te: '⚠️ ఇది ప్రామాణిక సూచన మోతాదు మాత్రమే. పిచికారీ చేయడానికి ముందు మీ స్థానిక కృషి విజ్ఞాన కేంద్రం (KVK) లేదా వ్యవసాయ అధికారిని సంప్రదించి నిర్ధారించుకోండి.',
  kn: '⚠️ ಇದು ಪ್ರಮಾಣಿತ ಉಲ್ಲೇಖದ ಪ್ರಮಾಣ ಮಾತ್ರ. ಸಿಂಪಡಿಸುವ ಮೊದಲು ನಿಮ್ಮ ಸ್ಥಳೀಯ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ (KVK) ಅಥವಾ ಕೃಷಿ ಅಧಿಕಾರಿಯೊಂದಿಗೆ ದೃಢೀಕರಿಸಿ.',
  hi: '⚠️ यह मानक संदर्भ खुराक है। खेत में छिड़काव करने से पहले अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि अधिकारी से सलाह अवश्य लें।'
};

/**
 * Compact catalog summary passed to Gemini for accurate product matching
 */
const CATALOG_FOR_AI = products.map((p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  dosage: p.dosage,
  targetProblems: p.targetProblems,
  suitableCrops: p.suitableCrops
}));

/**
 * Helper to match product objects by IDs or keywords
 */
export function getRecommendedProducts(productIds = [], keywords = []) {
  const matched = [];
  const addedIds = new Set();

  // 1. Match by explicit IDs
  if (Array.isArray(productIds)) {
    for (const id of productIds) {
      const found = products.find((p) => p.id === id);
      if (found && !addedIds.has(found.id)) {
        matched.push(found);
        addedIds.add(found.id);
      }
    }
  }

  // 2. Fallback keyword matching if fewer than 2 products
  if (matched.length < 2 && Array.isArray(keywords) && keywords.length > 0) {
    for (const kw of keywords) {
      if (!kw || typeof kw !== 'string') continue;
      const lowerKw = kw.toLowerCase();
      for (const p of products) {
        if (addedIds.has(p.id)) continue;
        const searchable = `${p.name} ${p.description} ${(p.targetProblems || []).join(' ')}`.toLowerCase();
        if (searchable.includes(lowerKw)) {
          matched.push(p);
          addedIds.add(p.id);
          if (matched.length >= 3) break;
        }
      }
      if (matched.length >= 3) break;
    }
  }

  // 3. If still empty, return top 2 general agro solutions
  if (matched.length === 0) {
    return products.slice(0, 2);
  }

  return matched.slice(0, 3);
}

/**
 * Robust JSON extraction from Gemini response
 */
function extractJsonFromText(rawText = '') {
  if (!rawText) return null;
  // Remove markdown code fences ```json ... ```
  let cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // try parsing directly
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Execute Gemini model call with automatic fallback across models
 */
async function callGemini(apiKey, contents, options = {}) {
  const genAI = new GoogleGenerativeAI(apiKey);

  const preferredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const candidates = Array.from(new Set([
    preferredModel,
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro'
  ]));

  let lastError = null;

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: options.generationConfig || {}
      });
      const result = await model.generateContent(contents);
      const text = result.response.text();
      return { text, modelName };
    } catch (err) {
      lastError = err;
      // If error is 404 (model not found) or quota, try next candidate
      console.warn(`Gemini model ${modelName} call failed: ${err.message}. Trying next candidate...`);
    }
  }

  throw lastError || new Error('All Gemini candidate models failed.');
}

/**
 * Rule-Based Diagnostic Engine (Works 100% offline with 15 localized diseases)
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

  // Targeted symptom fallback heuristics
  if (!matched) {
    if (normalizedQuery.includes('blast') || normalizedQuery.includes('అగ్గి') || normalizedQuery.includes('ಬೆಂಕಿ') || normalizedQuery.includes('झुलसा') || normalizedQuery.includes('धान')) {
      matched = diseases.find((d) => d.id === 'rice_blast');
    } else if (normalizedQuery.includes('late blight') || normalizedQuery.includes('లేట్ బ్లైట్') || normalizedQuery.includes('पछेती झुलसा') || (normalizedQuery.includes('potato') && normalizedQuery.includes('blight'))) {
      matched = diseases.find((d) => d.id === 'late_blight');
    } else if (normalizedQuery.includes('powder') || normalizedQuery.includes('white') || normalizedQuery.includes('బూడిద') || normalizedQuery.includes('ಬೂದಿ') || normalizedQuery.includes('सफेद')) {
      matched = diseases.find((d) => d.id === 'powdery_mildew');
    } else if (normalizedQuery.includes('curl') || normalizedQuery.includes('ముడత') || normalizedQuery.includes('ಮುದುರು') || normalizedQuery.includes('मुड़')) {
      matched = diseases.find((d) => d.id === 'leaf_curl_virus');
    } else if (normalizedQuery.includes('aphid') || normalizedQuery.includes('thrip') || normalizedQuery.includes('whitefly') || normalizedQuery.includes('దోమ') || normalizedQuery.includes('పురుగు') || normalizedQuery.includes('कीट') || normalizedQuery.includes('माहू')) {
      matched = diseases.find((d) => d.id === 'sucking_pests_infestation');
    } else if (normalizedQuery.includes('wilt') || normalizedQuery.includes('ఎండు') || normalizedQuery.includes('ಸೊರಗು') || normalizedQuery.includes('उकठा')) {
      matched = diseases.find((d) => d.id === 'fusarium_wilt');
    } else if (normalizedQuery.includes('rust') || normalizedQuery.includes('తుప్పు') || normalizedQuery.includes('ತುಕ್ಕು') || normalizedQuery.includes('गेरुआ')) {
      matched = diseases.find((d) => d.id === 'leaf_rust');
    } else if (normalizedQuery.includes('bacterial') || normalizedQuery.includes('క్యాంకర్') || normalizedQuery.includes('బాక్టీరియా') || normalizedQuery.includes('जीवाणु')) {
      matched = diseases.find((d) => d.id === 'bacterial_leaf_blight');
    } else if (normalizedQuery.includes('anthracnose') || normalizedQuery.includes('fruit rot') || normalizedQuery.includes('కాయ కుళ్ళు') || normalizedQuery.includes('फल सड़न')) {
      matched = diseases.find((d) => d.id === 'anthracnose');
    } else if (normalizedQuery.includes('boron') || normalizedQuery.includes('crack') || normalizedQuery.includes('పగుళ్లు') || normalizedQuery.includes('हूल झड़ना') || normalizedQuery.includes('फूल')) {
      matched = diseases.find((d) => d.id === 'boron_deficiency');
    } else if (normalizedQuery.includes('potash') || normalizedQuery.includes('potassium') || normalizedQuery.includes('edge') || normalizedQuery.includes('పొటాష్') || normalizedQuery.includes('पोटाश')) {
      matched = diseases.find((d) => d.id === 'potassium_deficiency');
    } else if (normalizedQuery.includes('zinc') || normalizedQuery.includes('జింక్') || normalizedQuery.includes('వరి') || normalizedQuery.includes('paddy') || normalizedQuery.includes('धान') || normalizedQuery.includes('khaira')) {
      matched = diseases.find((d) => d.id === 'zinc_deficiency');
    } else if (normalizedQuery.includes('yellow') || normalizedQuery.includes('పసుపు') || normalizedQuery.includes('ಹಳದಿ') || normalizedQuery.includes('पीला') || normalizedQuery.includes('nitrogen') || normalizedQuery.includes('urea')) {
      matched = diseases.find((d) => d.id === 'nitrogen_deficiency');
    }
  }

  // If no match could be identified honestly
  if (!matched) {
    const noMatchMessages = {
      en: `I couldn't identify a matching crop disease with certainty from the symptoms provided.\n\nTo help pinpoint the diagnosis, could you clarify:\n1. Which crop is affected (e.g., Tomato, Paddy, Chili, Cotton)?\n2. Where are the symptoms located (older bottom leaves, new upper leaves, fruits, or stems)?\n3. Do you see leaf spots, powdery deposits, yellowing, water-soaked rot, or curling?`,
      te: `మీరు తెలిపిన లక్షణాలతో నిర్దిష్ట పంట తెగులును ఖచ్చితంగా గుర్తించలేకపోయాను.\n\nసమస్యను స్పష్టంగా తెలుసుకోవడానికి దయచేసి ఈ వివరాలు తెలపండి:\n1. ఏ పంటను సాగు చేస్తున్నారు (ఉదా: టమోటా, వరి, మిర్చి, పత్తి)?\n2. తెగులు పాత ఆకులపై ఉందా లేదా పై లేత చిగుళ్ళపై, కాయలపై ఉందా?\n3. మచ్చలు, బూడిద పూత, పసుపు రంగు, కుళ్ళు లేదా ఆకులు ముడుచుకుపోవడం వంటి వాటిలో ఏది గమనించారు?`,
      kn: `ನೀವು ನೀಡಿರುವ ಲಕ್ಷಣಗಳೊಂದಿಗೆ ನಿಖರವಾದ ರೋಗವನ್ನು ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.\n\nಸಮಸ್ಯೆಯನ್ನು ತಿಳಿಯಲು ದಯವಿಟ್ಟು ಈ ವಿವರಗಳನ್ನು ನೀಡಿ:\n1. ಯಾವ ಬೆಳೆ ಬೆಳೆಯುತ್ತಿದ್ದೀರಿ (ಉದಾ: ಟೊಮೆಟೊ, ಭತ್ತ, ಮೆಣಸಿನಕಾಯಿ)?\n2. ರೋಗದ ಲಕ್ಷಣಗಳು ಹಳೆಯ ಕೆಳ ಎಲೆಗಳ ಮೇಲಿದೆಯೇ ಅಥವಾ ಮೇಲಿನ ಹೊಸ ಚಿಗುರುಗಳಲ್ಲಿದೆಯೇ?\n3. ಎಲೆ ಚುಕ್ಕೆಗಳು, ಬೂದಿ ಲೇಪನ, ಹಳದಿ ಬಣ್ಣ ಅಥವಾ ಎಲೆ ಮುದುರಿಕೊಳ್ಳುವಿಕೆ ಇದೆಯೇ?`,
      hi: `बताए गए लक्षणों से किसी निश्चित फसल रोग की पुष्टि नहीं हो सकी।\n\nसटीक पहचान के लिए कृपया निम्न विवरण दें:\n1. आप कौन सी फसल उगा रहे हैं (जैसे: टमाटर, धान, मिर्च, कपास)?\n2. लक्षण पौधे की निचली पुरानी पत्तियों पर हैं, नई शाखाओं पर, या फलों पर?\n3. क्या पत्तियों पर काले/भूरे धब्बे, सफेद चूर्ण, पीलापन, सड़न या पत्तियां मुड़ना दिख रहा है?`
    };

    return {
      success: true,
      matched: false,
      engine: 'Kisan Knowledge Base (Offline)',
      language: validLang,
      diagnosis: null,
      message: noMatchMessages[validLang] || noMatchMessages.en,
      disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
      followUpQuestions: [
        validLang === 'te' ? 'వరిలో అగ్గి తెగులు' : validLang === 'hi' ? 'धान में खैरा रोग' : validLang === 'kn' ? 'ಭತ್ತದ ಬೆಂಕಿ ರೋಗ' : 'Rice Blast in Paddy',
        validLang === 'te' ? 'మిరపలో ఆకు ముడత' : validLang === 'hi' ? 'मिर्च में पत्ती मरोड़' : validLang === 'kn' ? 'ಮೆಣಸಿನಕಾಯಿ ಎಲೆ ಮುದುರುವುದು' : 'Chili Leaf Curl Virus',
        validLang === 'te' ? 'టమోటాలో ఆకు మచ్చల తెగులు' : validLang === 'hi' ? 'टमाटर में अगेती झुलसा' : validLang === 'kn' ? 'ಟೊಮೆಟೊ ಎಲೆ ಚುಕ್ಕೆ ರೋಗ' : 'Tomato Early Blight',
        validLang === 'te' ? 'ఆకులు పసుపుగా మారడం' : validLang === 'hi' ? 'पत्तियों में पीलापन' : validLang === 'kn' ? 'ಹಳದಿ ಎಲೆ ಕೊರತೆ' : 'Yellowing of leaves'
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

  const matchedProducts = getRecommendedProducts(matched.recommendedProductIds, matched.keywords);

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
    engine: 'Kisan Knowledge Base (Offline)',
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
 * Handle plant disease diagnosis via photo upload (or photo + user text)
 */
export async function diagnoseCrop(req, res) {
  try {
    const { message = '', language = 'en' } = req.body;
    const file = req.file;
    const validLang = ['en', 'te', 'kn', 'hi'].includes(language) ? language : 'en';

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // If Gemini API Key is provided and an image was uploaded, run live multimodal AI vision
    if (apiKey && file) {
      try {
        const imageBuffer = fs.readFileSync(file.path);
        const imagePart = {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: file.mimetype
          }
        };

        const targetLangName =
          validLang === 'te' ? 'Telugu (తెలుగు)' :
          validLang === 'kn' ? 'Kannada (ಕನ್ನಡ)' :
          validLang === 'hi' ? 'Hindi (हिंदी)' : 'English';

        const userContextText = message && message.trim().length > 0
          ? `Farmer's observations / symptoms described: "${message.trim()}"`
          : 'No extra description provided by farmer; rely primarily on the image analysis.';

        const prompt = `You are the Chief Agricultural Scientist, Plant Pathologist, and Extension Officer at KisanAgro India.
You specialize in diagnosing crop diseases, nutrient deficiencies, and pest infestations across Indian and international agriculture.

USER INPUT:
${userContextText}

STORE PRODUCT INVENTORY:
${JSON.stringify(CATALOG_FOR_AI, null, 2)}

INSPECTION REQUIREMENTS:
1. Verify if the uploaded image shows a plant, crop leaf, stem, fruit, or farm vegetation.
   - If the image is NOT a plant (e.g. human, animal, car, random object, empty room), set "isPlantOrCrop": false and provide a polite refusal asking for a clear crop leaf photo in ${targetLangName}.
2. If it IS a plant:
   - Accurately determine the crop name (e.g., Tomato, Paddy/Rice, Chili, Cotton, Potato, Wheat, Mango, Cucurbit).
   - Accurately diagnose the exact disease, pest, or nutrient deficiency.
   - Provide TWO DISTINCT solutions:
     a) "organicRemedy": practical natural home preparation with ingredients (e.g., cold-pressed neem oil, sour buttermilk + turmeric, fermented garlic-chili spray, wood ash, or Trichoderma viride) and application method.
     b) "shopTreatment": certified chemical or bio-fertilizer/fungicide/insecticide.
     c) "dosagePercentage": standard dilution concentration (e.g. 0.25% concentration / 2.5g per Liter / 500g in 200L water per acre).
   - Choose 1 to 3 EXACT matching "recommendedProductIds" from the provided STORE PRODUCT INVENTORY above (e.g. ["prod-1", "prod-3"]).
3. LANGUAGE REQUIREMENT:
   Translate the fields ("diseaseName", "symptoms", "causes", "organicRemedy", "shopTreatment", "dosagePercentage", "explanation") into ${targetLangName} script!

OUTPUT FORMAT:
Return response ONLY as a single valid JSON object with this exact structure:
{
  "isPlantOrCrop": true,
  "cropIdentified": "Crop name",
  "diseaseName": "Disease Name in ${targetLangName} with English scientific name",
  "severity": "Low" | "Moderate" | "High",
  "symptoms": "Detailed visual symptoms observed in ${targetLangName}",
  "causes": "Underlying pathogen, vector, or deficiency cause in ${targetLangName}",
  "organicRemedy": "Clear step-by-step organic/natural remedy in ${targetLangName}",
  "shopTreatment": "Commercial input recommendation in ${targetLangName}",
  "dosagePercentage": "Exact dosage & dilution rate in ${targetLangName}",
  "recommendedProductIds": ["prod-X", "prod-Y"],
  "recommendedProductKeywords": ["Copper", "Mancozeb"],
  "explanation": "Summary paragraph to the farmer in ${targetLangName}"
}`;

        const { text, modelName } = await callGemini(apiKey, [prompt, imagePart]);
        const parsed = extractJsonFromText(text);

        if (parsed) {
          // Check if image is not a plant
          if (parsed.isPlantOrCrop === false) {
            const nonPlantMessage = parsed.explanation || (
              validLang === 'te' ? 'అప్‌లోడ్ చేసిన ఫోటోలో పంట లేదా మొక్క కనిపించడం లేదు. దయచేసి తెగులు సోకిన ఆకు లేదా పంట భాగాన్ని స్పష్టంగా ఫోటో తీసి అప్‌లోడ్ చేయండి.' :
              validLang === 'hi' ? 'अपलोड की गई फोटो में फसल या पौधे की पत्ती नहीं दिख रही है। कृपया प्रभावित पौधे की स्पष्ट तस्वीर अपलोड करें।' :
              validLang === 'kn' ? 'ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಚಿತ್ರದಲ್ಲಿ ಯಾವುದೇ ಬೆಳೆ ಅಥವಾ ಎಲೆ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟವಾದ ಎಲೆಯ ಫೋಟೋವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' :
              'The uploaded image does not appear to show a crop leaf or plant. Please upload a clear photo of the affected plant leaf, stem, or fruit.'
            );

            return res.json({
              success: true,
              matched: false,
              engine: 'Gemini Multimodal Vision AI',
              model: modelName,
              language: validLang,
              imageUrl: `/uploads/${file.filename}`,
              diagnosis: null,
              message: nonPlantMessage,
              disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
              followUpQuestions: [
                validLang === 'te' ? 'టమోటా ఆకు మచ్చ' : 'Tomato Leaf Spot',
                validLang === 'te' ? 'వరి అగ్గి తెగులు' : 'Paddy Rice Blast',
                validLang === 'te' ? 'మిరప ఆకు ముడత' : 'Chili Leaf Curl'
              ],
              recommendedProducts: []
            });
          }

          const matchedProducts = getRecommendedProducts(parsed.recommendedProductIds, parsed.recommendedProductKeywords);

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

          const organicTitle = validLang === 'te' ? '🌿 1. సేంద్రీయ పరిష్కారం' : validLang === 'hi' ? '🌿 1. जैविक घरेलू उपाय' : validLang === 'kn' ? '🌿 1. ಸಾವಯವ ಮನೆಮದ್ದು' : '🌿 1. Organic Remedy';
          const shopTitle = validLang === 'te' ? '🧪 2. దుకాణ ఎరువు & రసాయన మందు' : validLang === 'hi' ? '🧪 2. दुकान की दवा' : validLang === 'kn' ? '🧪 2. ಅಂಗಡಿ ಔಷಧ' : '🧪 2. Shop Treatment';

          const formattedMessage = parsed.explanation
            ? `${parsed.explanation}\n\n${organicTitle}:\n${parsed.organicRemedy}\n\n${shopTitle}:\n${parsed.shopTreatment} (${parsed.dosagePercentage})`
            : `${organicTitle}:\n${parsed.organicRemedy}\n\n${shopTitle}:\n${parsed.shopTreatment} (${parsed.dosagePercentage})`;

          return res.json({
            success: true,
            matched: true,
            engine: 'Gemini Multimodal Vision AI',
            model: modelName,
            language: validLang,
            imageUrl: `/uploads/${file.filename}`,
            diagnosis: {
              cropIdentified: parsed.cropIdentified || 'Crop',
              diseaseName: parsed.diseaseName,
              severity: parsed.severity || 'Moderate',
              symptoms: parsed.symptoms,
              causes: parsed.causes,
              organicRemedy: parsed.organicRemedy,
              shopTreatment: parsed.shopTreatment,
              dosagePercentage: parsed.dosagePercentage
            },
            disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
            message: formattedMessage,
            recommendedProducts: matchedProducts
          });
        }
      } catch (aiError) {
        console.warn('Gemini AI vision call failed, falling back to local rule-based matcher:', aiError.message);
      }
    }

    // Fallback to local rule-based matcher
    const result = runOfflineDiagnosis(message, file ? file.originalname : '', validLang);
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
 * Handle conversational text chat (Symptom diagnosis & Agricultural advisory)
 * Connects to live Gemini if API key is present, otherwise uses local matcher.
 */
export async function chatMessage(req, res) {
  try {
    const { message = '', language = 'en' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const validLang = ['en', 'te', 'kn', 'hi'].includes(language) ? language : 'en';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    // If Gemini key is set, use live generative model with agricultural domain training
    if (apiKey) {
      try {
        const targetLangName =
          validLang === 'te' ? 'Telugu (తెలుగు)' :
          validLang === 'kn' ? 'Kannada (ಕನ್ನಡ)' :
          validLang === 'hi' ? 'Hindi (हिंदी)' : 'English';

        const prompt = `You are KisanAgro's Chief Agricultural Scientist and Agronomy Doctor.
The farmer is consulting you in ${targetLangName} with this message:
"${message}"

AVAILABLE STORE PRODUCTS CATALOG:
${JSON.stringify(CATALOG_FOR_AI, null, 2)}

TASK:
1. Determine if the farmer is describing plant symptoms, disease, pest damage, deficiency, or seeking treatment.
   - If YES (Crop / Disease Inquiry):
     Set "isCropInquiry": true.
     Identify the disease/problem, organic remedy, shop treatment, dosage, and 1 to 3 matching product IDs from the catalog.
   - If NO (General agricultural advisory, greeting, fertilizer guide, cultivation query):
     Set "isCropInquiry": false.
     Provide an expert, comprehensive, practical answer in ${targetLangName} and suggest any relevant product IDs from the catalog.
2. CRITICAL:
   Translate all response text into ${targetLangName} script!

OUTPUT FORMAT:
Return response ONLY as valid JSON in this exact structure:
{
  "isCropInquiry": true,
  "cropIdentified": "...",
  "diseaseName": "Disease / Disorder name in ${targetLangName}",
  "severity": "Low" | "Moderate" | "High",
  "symptoms": "...",
  "causes": "...",
  "organicRemedy": "1 organic home preparation recipe in ${targetLangName}",
  "shopTreatment": "1 certified shop fertilizer / fungicide in ${targetLangName}",
  "dosagePercentage": "Standard percentage concentration and grams per liter in ${targetLangName}",
  "recommendedProductIds": ["prod-X", "prod-Y"],
  "explanation": "Conversational, empathetic explanation to the farmer in ${targetLangName}"
}`;

        const { text, modelName } = await callGemini(apiKey, prompt);
        const parsed = extractJsonFromText(text);

        if (parsed) {
          const matchedProducts = getRecommendedProducts(parsed.recommendedProductIds);

          if (parsed.isCropInquiry && parsed.diseaseName) {
            // Save to history if logged in
            if (req.user) {
              try {
                insertDiagnosisStmt.run({
                  userId: req.user.id,
                  diseaseId: 'gemini_text_diagnosis',
                  diseaseName: parsed.diseaseName,
                  severity: parsed.severity || 'Moderate',
                  imageUrl: null,
                  queryText: message,
                  language: validLang,
                  createdAt: new Date().toISOString()
                });
              } catch (histErr) {
                console.warn('Failed to record text diagnosis history:', histErr.message);
              }
            }

            const organicTitle = validLang === 'te' ? '🌿 1. సేంద్రీయ పరిష్కారం' : validLang === 'hi' ? '🌿 1. जैविक घरेलू उपाय' : validLang === 'kn' ? '🌿 1. ಸಾವಯವ ಮನೆಮದ್ದು' : '🌿 1. Organic Remedy';
            const shopTitle = validLang === 'te' ? '🧪 2. దుకాణ ఎరువు & రసాయన మందు' : validLang === 'hi' ? '🧪 2. दुकान की दवा' : validLang === 'kn' ? '🧪 2. ಅಂಗಡಿ ಔಷಧ' : '🧪 2. Shop Treatment';

            return res.json({
              success: true,
              matched: true,
              engine: 'Gemini Generative AI',
              model: modelName,
              language: validLang,
              diagnosis: {
                cropIdentified: parsed.cropIdentified,
                diseaseName: parsed.diseaseName,
                severity: parsed.severity || 'Moderate',
                symptoms: parsed.symptoms,
                causes: parsed.causes,
                organicRemedy: parsed.organicRemedy,
                shopTreatment: parsed.shopTreatment,
                dosagePercentage: parsed.dosagePercentage
              },
              message: parsed.explanation || `${organicTitle}:\n${parsed.organicRemedy}\n\n${shopTitle}:\n${parsed.shopTreatment} (${parsed.dosagePercentage})`,
              disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
              recommendedProducts: matchedProducts
            });
          } else {
            // Conversational advisory
            return res.json({
              success: true,
              matched: true,
              engine: 'Gemini Generative AI',
              model: modelName,
              language: validLang,
              diagnosis: null,
              message: parsed.explanation || text,
              disclaimer: DOSAGE_DISCLAIMER[validLang] || DOSAGE_DISCLAIMER.en,
              recommendedProducts: matchedProducts
            });
          }
        } else {
          // If JSON extraction failed, return direct text
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
        }
      } catch (geminiErr) {
        console.warn('Gemini chat error, falling back to local matcher:', geminiErr.message);
      }
    }

    // Fallback to local rule-based matcher
    const result = runOfflineDiagnosis(message, '', validLang);
    return res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ success: false, message: 'Chat service error. Please try again.' });
  }
}

/**
 * Endpoint to report current AI diagnostic engine status
 */
export function getChatStatus(req, res) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const configured = Boolean(apiKey && apiKey.trim().length > 5 && !apiKey.includes('your_gemini_api_key'));
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  return res.json({
    success: true,
    geminiConfigured: configured,
    activeEngine: configured ? 'Gemini Multimodal Vision AI' : 'Kisan Knowledge Base (Offline)',
    preferredModel,
    supportedLanguages: ['en', 'te', 'kn', 'hi'],
    knowledgeBaseDiseases: diseases.length,
    catalogProducts: products.length
  });
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
