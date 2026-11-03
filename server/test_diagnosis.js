import { runOfflineDiagnosis, getRecommendedProducts, getChatStatus } from './controllers/diagnosisController.js';

console.log('Testing diagnosis matcher:');

const testCases = [
  { q: 'Tomato leaves have circular brown spots with rings', lang: 'en', expected: 'early_blight' },
  { q: 'వరిలో ఆకులపై కంటి ఆకారపు మచ్చలు వచ్చాయి blast', lang: 'te', expected: 'rice_blast' },
  { q: 'Chili leaves are curling upward with whiteflies', lang: 'en', expected: 'leaf_curl_virus' },
  { q: 'ಟೊಮೆಟೊ ಎಲೆಗಳು ಹಳದಿಯಾಗಿ ಬಾಡಿಹೋಗಿವೆ wilt', lang: 'kn', expected: 'fusarium_wilt' },
  { q: 'टमाटर के फल फट रहे हैं और फूल झड़ रहे हैं boron', lang: 'hi', expected: 'boron_deficiency' },
  { q: 'Potato leaves have dark water soaked lesions late blight', lang: 'en', expected: 'late_blight' },
  { q: 'धान में खैरा रोग और पत्तियों पर कत्थई धब्बे', lang: 'hi', expected: 'zinc_deficiency' },
  { q: 'Powdery white coating on grape leaves', lang: 'en', expected: 'powdery_mildew' },
  { q: 'Tomato leaves are yellowing on old leaves urea', lang: 'en', expected: 'nitrogen_deficiency' },
  { q: 'కాయ కుళ్ళు తెగులు మరియు కొమ్మ ఎండు anthracnose', lang: 'te', expected: 'anthracnose' }
];

let passed = 0;
for (const tc of testCases) {
  const res = runOfflineDiagnosis(tc.q, '', tc.lang);
  const actual = res.diagnosis ? res.diagnosis.diseaseId : 'NONE';
  const ok = actual === tc.expected;
  if (ok) passed++;
  console.log(`${ok ? '✅' : '❌'} [${tc.lang}] Query: "${tc.q}" -> ${actual} (expected: ${tc.expected})`);
  if (res.recommendedProducts && res.recommendedProducts.length > 0) {
    console.log(`   🛒 Recommended: ${res.recommendedProducts.map(p => p.name).join(' | ')}`);
  }
}

console.log(`\nResult: ${passed}/${testCases.length} test cases passed.`);
if (passed === testCases.length) {
  console.log('🎉 All diagnosis test cases passed successfully!');
  process.exit(0);
} else {
  process.exit(1);
}
