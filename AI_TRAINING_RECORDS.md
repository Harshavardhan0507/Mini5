# 🌾 KisanAgro AI Plant Doctor - Training & Disease Diagnostic Records

This document serves as the official project record of the AI plant pathology training, knowledge grounding, multilingual disease database, certified product mappings, and automated test verification for **KisanAgro**.

---

## 📌 1. AI System & Model Configuration Record

| Attribute | Specification |
| :--- | :--- |
| **Primary AI Engine** | Google Gemini Multimodal Generative AI (`@google/generative-ai` v0.24.0) |
| **Default Model** | `gemini-1.5-flash` (configured via `GEMINI_MODEL` in `server/.env`) |
| **Model Fallback Chain** | `gemini-1.5-flash` ➔ `gemini-2.0-flash` ➔ `gemini-2.5-flash` ➔ `gemini-1.5-pro` |
| **Offline Fallback Engine** | Kisan Knowledge Base (Weighted Semantic Scoring Engine) |
| **Supported Input Modalities** | Leaf Photo Upload (JPG, PNG, WEBP) + Farmer Text Symptom Notes |
| **Supported Regional Languages** | English (`en`), Telugu (`te`), Kannada (`kn`), Hindi (`hi`) |
| **API Endpoints** | `POST /api/chat/diagnose`, `POST /api/chat/message`, `GET /api/chat/status`, `GET /api/chat/history` |

---

## 🔬 2. Master Record of Trained Plant Diseases & Disorders

The system is trained to identify and prescribe dual-action solutions for **15 core agricultural diseases and nutrient deficiencies**:

| # | Disease ID | Common & Scientific Name | Regional Script Names | Target Crops | Organic Remedy | Shop Treatment & Dosage |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `early_blight` | Early Blight (*Alternaria solani*) | **TE:** ఆకు మచ్చల తెగులు<br>**KN:** ಮುಂಗಾರು ಬ್ಲೈಟ್<br>**HI:** अगेती झुलसा | Tomato, Potato, Eggplant | Sour buttermilk + turmeric foliar spray | Copper Oxychloride 50% WP (0.25% - 2.5g/L) |
| **2** | `late_blight` | Late Blight (*Phytophthora infestans*) | **TE:** లేట్ బ్లైట్ / ఆకు మాకుడు<br>**KN:** ಹಿಂಗಾರು ಅಂಗಮಾರಿ<br>**HI:** पछेती झुलसा | Potato, Tomato | 1% Bordeaux mixture / Trichoderma drench | Metalaxyl 8% + Mancozeb 64% WP (0.25% - 2.5g/L) |
| **3** | `powdery_mildew` | Powdery Mildew (*Erysiphe / Leveillula*) | **TE:** బూడిద తెగులు<br>**KN:** ಬೂದಿ ರೋಗ<br>**HI:** चूर्णिल आसिता | Chili, Grapes, Cucurbits, Okra | Baking soda (5g/L) + mild liquid soap | Sulphur 80% WDG (0.30% - 3g/L) or Hexaconazole 5% SC (0.10% - 2ml/L) |
| **4** | `downy_mildew` | Downy Mildew (*Pseudoperonospora*) | **TE:** డౌనీ మిల్డ్యూ<br>**KN:** ಡೌನಿ ಮಿಲ್ಡ್ಯೂ<br>**HI:** मृदुरोमिल आसिता | Grapes, Cucurbits, Onion | Sour whey / buttermilk + asafoetida | Metalaxyl + Mancozeb 64% WP (0.25% - 2.5g/L) |
| **5** | `rice_blast` | Rice Blast (*Magnaporthe oryzae*) | **TE:** వరి అగ్గి తెగులు / మెడ విరుపు<br>**KN:** ಭತ್ತದ ಬೆಂಕಿ ರೋಗ<br>**HI:** धान का झुलसा / ब्लास्ट | Paddy (Rice), Wheat | 10% Fermented cow urine + neem oil decoction | Tricyclazole 75% WP (0.06% - 0.6g/L / 120g per acre) |
| **6** | `bacterial_leaf_blight` | Bacterial Leaf Blight (*Xanthomonas oryzae*) | **TE:** బాక్టీరియా ఎండు తెగులు (BLB)<br>**KN:** ಬ್ಯಾಕ್ಟೀರಿಯಲ್ ಎಲೆ ಕರಕಲು<br>**HI:** जीवाणु झुलसा | Paddy, Pomegranate, Citrus | Fresh cow dung slurry supernatant spray | Streptocycline 90% (6g/120L) + Copper Oxychloride 50% WP (2.5g/L) |
| **7** | `leaf_curl_virus` | Leaf Curl Virus (Gemini Virus) | **TE:** ఆకు ముడత తెగులు<br>**KN:** ಎಲೆ ಮುದುರುವ ರೋಗ<br>**HI:** पत्ती मरोड़ रोग | Chili, Tomato, Papaya, Cotton | Garlic-chili extract + yellow sticky traps | Imidacloprid 17.8% SL (0.5ml/L) + Bio-Neem Supreme (4ml/L) + NPK 19:19:19 |
| **8** | `anthracnose` | Anthracnose / Fruit Rot (*Colletotrichum*) | **TE:** కాయ కుళ్ళు / కొమ్మ ఎండు<br>**KN:** ಆಂಥ್ರಾಕ್ನೋಸ್ / ಕಾಯಿ ಕೊಳೆ<br>**HI:** एंथ्रेक्नोज / फल सड़न | Chili, Mango, Grapes, Tomato | Panchagavya 3% foliar spray + twig pruning | Azoxystrobin 18.2% + Difenoconazole 11.4% SC (0.10% - 1ml/L) |
| **9** | `leaf_rust` | Leaf Rust (*Puccinia spp.*) | **TE:** ఆకు తుప్పు తెగులు<br>**KN:** ಎಲೆ ತುಕ್ಕು ರೋಗ<br>**HI:** पत्ती गेरुआ / रतुआ | Wheat, Groundnut, Soybean | Sour buttermilk (10%) + wettable sulphur | Hexaconazole 5% SC (0.10% - 2ml/L) or Mancozeb 75% WP (2.5g/L) |
| **10** | `fusarium_wilt` | Fusarium Wilt / Root Rot (*Fusarium*) | **TE:** ఎండు తెగులు / వేరు కుళ్ళు<br>**KN:** ಸೊರಗು ರೋಗ / ಬೇರು ಕೊಳೆ<br>**HI:** उकठा रोग / जड़ सड़न | Banana, Tomato, Chili, Cotton | Trichoderma Viride root drench (10g/L) | Bio-Trichoderma Viride 1% WP (5g/L) + Copper Oxychloride root drench |
| **11** | `sucking_pests_infestation` | Sucking Pests (Aphids, Thrips, Whiteflies, Mites) | **TE:** రసం పీల్చే పురుగులు<br>**KN:** ರಸ ಹೀರುವ ಕೀಟಗಳು<br>**HI:** रस चूसक कीट | Cotton, Chili, Tomato, Okra | Cold-pressed Neem oil (5ml/L) + soap + yellow/blue sticky traps | Imidacloprid 17.8% SL (0.5ml/L) or Sulphur 80% WDG (for mites) |
| **12** | `nitrogen_deficiency` | Nitrogen / Macronutrient Deficiency | **TE:** నత్రజని లోపం<br>**KN:** ಸಾರಜನಕ ಕೊರತೆ<br>**HI:** नाइट्रोजन की कमी | Paddy, Maize, Wheat, Sugarcane | Jeevamrutham root drench + Vermicompost top-dress | NPK 19:19:19 water-soluble foliar spray (0.50% - 5g/L) |
| **13** | `zinc_deficiency` | Zinc Deficiency / Khaira Disease | **TE:** జింక్ లోపం / ఖైరా తెగులు<br>**KN:** ಸತುವಿನ ಕೊರತೆ / ಖೈರಾ ರೋಗ<br>**HI:** जिंक की कमी / खैरा रोग | Paddy (Rice), Maize, Citrus | Wood ash (50kg/acre) broadcast with cow dung manure | Chelated Zinc EDTA 12% (0.10% - 1g to 1.5g/L) |
| **14** | `potassium_deficiency` | Potassium (Potash) Deficiency | **TE:** పొటాష్ లోపం<br>**KN:** ಪೊಟ್ಯಾಶ್ ಕೊರತೆ<br>**HI:** पोटाश की कमी | Paddy, Chili, Tomato, Banana | Wood ash (50kg/acre) or composted organic biomass | Sulphate of Potash (SOP 0:0:50) foliar spray (0.50% - 5g/L) |
| **15** | `boron_deficiency` | Boron Micronutrient Deficiency | **TE:** బోరాన్ లోపం (కాయ పగుళ్లు)<br>**KN:** ಬೋರಾನ್ ಕೊರತೆ<br>**HI:** बोरॉन की कमी (फल फटना) | Tomato, Pomegranate, Citrus | Thick organic vermicompost mulching + seaweed extract | Disodium Octaborate Tetrahydrate (Boron 20%) foliar spray (0.10% - 1g/L) |

---

## 🛒 3. Product Catalog & Inventory Mapping Record

All 16 products are registered in [`server/data/products.json`](file:///C:/Users/Kolli%20Harshavardhan/Documents/Mini5/server/data/products.json) and fed directly into the Gemini prompt:

| Product ID | Product Name | Category | Weight | Price (₹) | Target Disease / Deficiency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `prod-1` | Kisan Copper Oxychloride 50% WP | Fungicide / Bactericide | 500g | ₹349 | Early Blight, Late Blight, Canker, Leaf Spot |
| `prod-2` | Bio-Neem Supreme (Cold Pressed 10,000 PPM) | Organic Pesticide | 250ml | ₹280 | Leaf Curl vector, Whitefly, Aphids, Thrips |
| `prod-3` | Mancozeb 75% WP Contact Fungicide | Fungicide | 1kg | ₹399 | Leaf Rust, Early Blight, Anthracnose, Die Back |
| `prod-4` | NPK 19:19:19 100% Water Soluble Fertilizer | Macronutrient | 1kg | ₹240 | Stunted Growth, Yellowing, Nutrient Deficiency |
| `prod-5` | Chelated Zinc (Zn-EDTA 12%) | Micronutrient | 250g | ₹310 | Khaira Disease, Zinc Deficiency, Chlorosis |
| `prod-6` | Hexaconazole 5% SC Systemic Fungicide | Fungicide | 500ml | ₹420 | Powdery Mildew, Sheath Blight, Tikka, Rust |
| `prod-7` | Organic Vermicompost Premium Bio-Gold | Organic Compost | 10kg | ₹350 | Soil Structure, Humus, Root Health |
| `prod-8` | Sulphur 80% WDG (Dual Action) | Fungicide / Micronutrient | 1kg | ₹290 | Powdery Mildew, Mites, Sulphur Deficiency |
| `prod-9` | Tricyclazole 75% WP (Rice Blast Specialist) | Fungicide | 250g | ₹480 | Rice Blast (Leaf, Neck, Node Blast), Sheath Rot |
| `prod-10` | Metalaxyl 8% + Mancozeb 64% WP | Systemic & Contact Fungicide | 500g | ₹450 | Late Blight, Downy Mildew, Damping Off |
| `prod-11` | Streptocycline + Tetracycline Bactericide | Bactericide | 6g Pack | ₹120 | Bacterial Leaf Blight, Bacterial Canker, Wilt |
| `prod-12` | Azoxystrobin 18.2% + Difenoconazole 11.4% SC | Broad Spectrum Fungicide | 200ml | ₹680 | Anthracnose, Fruit Rot, Die Back, Blights |
| `prod-13` | Imidacloprid 17.8% SL | Systemic Insecticide | 250ml | ₹320 | Whitefly, Aphids, Thrips, Leaf Curl Vector |
| `prod-14` | Disodium Octaborate Tetrahydrate (Boron 20%) | Micronutrient | 250g | ₹260 | Boron Deficiency, Fruit Cracking, Flower Drop |
| `prod-15` | Potassium Sulphate (SOP 0:0:50) | Potash Fertilizer | 1kg | ₹380 | Potassium Deficiency, Leaf Scorch, Grain Sizing |
| `prod-16` | Bio-Trichoderma Viride (1% WP Bio-Fungicide) | Bio-Control | 1kg | ₹220 | Fusarium Wilt, Root Rot, Collar Rot, Damping Off |

---

## 🧪 4. Automated Verification Test Suite Record

Test Script: [`server/test_diagnosis.js`](file:///C:/Users/Kolli%20Harshavardhan/Documents/Mini5/server/test_diagnosis.js)  
Command: `npm test --prefix server`  
Status: **10/10 Test Cases Passed (100% Accuracy)**

```
Testing diagnosis matcher:
✅ [en] Query: "Tomato leaves have circular brown spots with rings" -> early_blight
   🛒 Recommended: Kisan Copper Oxychloride 50% WP | Mancozeb 75% WP | Azoxystrobin combo
✅ [te] Query: "వరిలో ఆకులపై కంటి ఆకారపు మచ్చలు వచ్చాయి blast" -> rice_blast
   🛒 Recommended: Tricyclazole 75% WP | Hexaconazole 5% SC | NPK 19:19:19
✅ [en] Query: "Chili leaves are curling upward with whiteflies" -> leaf_curl_virus
   🛒 Recommended: Imidacloprid 17.8% SL | Bio-Neem Supreme | NPK 19:19:19
✅ [kn] Query: "ಟೊಮೆಟೊ ಎಲೆಗಳು ಹಳದಿಯಾಗಿ ಬಾಡಿಹೋಗಿವೆ wilt" -> fusarium_wilt
   🛒 Recommended: Bio-Trichoderma Viride | Organic Vermicompost | Kisan Copper Oxychloride
✅ [hi] Query: "टमाटर के फल फट रहे हैं और फूल झड़ रहे हैं boron" -> boron_deficiency
   🛒 Recommended: Boron 20% | NPK 19:19:19 | Organic Vermicompost
✅ [en] Query: "Potato leaves have dark water soaked lesions late blight" -> late_blight
   🛒 Recommended: Metalaxyl + Mancozeb | Kisan Copper Oxychloride | Mancozeb 75% WP
✅ [hi] Query: "धान में खैरा रोग और पत्तियों पर कत्थई धब्बे" -> zinc_deficiency
   🛒 Recommended: Chelated Zinc EDTA | NPK 19:19:19
✅ [en] Query: "Powdery white coating on grape leaves" -> powdery_mildew
   🛒 Recommended: Sulphur 80% WDG | Hexaconazole 5% SC | Bio-Neem Supreme
✅ [en] Query: "Tomato leaves are yellowing on old leaves urea" -> nitrogen_deficiency
   🛒 Recommended: NPK 19:19:19 | Organic Vermicompost
✅ [te] Query: "కాయ కుళ్ళు తెగులు మరియు కొమ్మ ఎండు anthracnose" -> anthracnose
   🛒 Recommended: Azoxystrobin combo | Mancozeb 75% WP | Kisan Copper Oxychloride

Result: 10/10 test cases passed.
🎉 All diagnosis test cases passed successfully!
```

---

## 📝 5. How to Add Custom Diseases or Products in the Future

1. **Adding a Disease**: Add an object into [`server/data/localizedDiseases.json`](file:///C:/Users/Kolli%20Harshavardhan/Documents/Mini5/server/data/localizedDiseases.json) with `id`, `keywords`, translations for `name`, `symptoms`, `causes`, `organicRemedy`, `shopTreatment`, `dosagePercentage`, and `recommendedProductIds`.
2. **Adding a Product**: Add an object into [`server/data/products.json`](file:///C:/Users/Kolli%20Harshavardhan/Documents/Mini5/server/data/products.json) with `id`, `name`, `category`, `price`, `stock`, `weight`, `image`, `description`, `dosage`, `suitableCrops`, and `targetProblems`.
3. **Verify**: Run `npm test --prefix server` to confirm matching works smoothly.
