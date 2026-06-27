const LANGUAGE_KEY = 'grammarfix_language';

const SUPPORTED_LANGUAGES = {
  auto: { label: 'Auto-detect', code: 'auto' },
  en: { label: 'English', code: 'en' },
  es: { label: 'Spanish', code: 'es' },
  fr: { label: 'French', code: 'fr' },
};

const TRIGRAM_PROFILES = {
  en: [
    'the',
    'and',
    'ing',
    'tion',
    'ent',
    'her',
    'for',
    'tha',
    'nth',
    'int',
    'hat',
    'thi',
    'ion',
    'ter',
    'was',
    'you',
    'ith',
    'ver',
    'all',
    'wit',
    'his',
    'ere',
    'ons',
    'est',
    'rea',
    'are',
    'not',
    'ess',
    'ted',
    'ave',
  ],
  es: [
    'que',
    'ión',
    'ent',
    'ado',
    'aci',
    'ción',
    'los',
    'las',
    'nte',
    'una',
    'ara',
    'est',
    'con',
    'ien',
    'ero',
    'por',
    'sta',
    'tra',
    'mos',
    'era',
    'des',
    'tos',
    'res',
    'ada',
    'del',
    'ues',
    'par',
    'com',
    'men',
    'ran',
  ],
  fr: [
    'les',
    'ent',
    'que',
    'des',
    'tion',
    'ait',
    'est',
    'ant',
    'ion',
    'ous',
    'une',
    'eur',
    'pas',
    'ment',
    'par',
    'ans',
    'ais',
    'sur',
    'pou',
    'our',
    'res',
    'com',
    'out',
    'qui',
    'con',
    'ell',
    'ait',
    'ont',
    'ien',
    'dan',
  ],
};

function extractTrigrams(text) {
  const clean = text.toLowerCase().replace(/[^a-záàâäãåæçéèêëíìîïñóòôöõúùûüýÿœ\s]/g, '');
  const words = clean.split(/\s+/).filter((w) => w.length >= 3);
  const trigrams = {};

  for (const word of words) {
    for (let i = 0; i <= word.length - 3; i++) {
      const tri = word.slice(i, i + 3);
      trigrams[tri] = (trigrams[tri] || 0) + 1;
    }
  }

  return Object.entries(trigrams)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([tri]) => tri);
}

export function detectLanguage(text) {
  if (!text || text.trim().length < 20) return 'en';

  const textTrigrams = new Set(extractTrigrams(text));
  let bestLang = 'en';
  let bestScore = 0;

  for (const [lang, profile] of Object.entries(TRIGRAM_PROFILES)) {
    const score = profile.filter((tri) => textTrigrams.has(tri)).length;
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  return bestLang;
}

export function getSystemPrompt(language) {
  const prompts = {
    en: 'Fix grammar and spelling in the following text. Return only the corrected text, nothing else. Preserve the original tone and formatting.',
    es: 'Corrige la gramática y ortografía del siguiente texto. Devuelve solo el texto corregido, nada más. Preserva el tono y formato original. Respond in Spanish.',
    fr: "Corrigez la grammaire et l'orthographe du texte suivant. Retournez uniquement le texte corrigé, rien d'autre. Préservez le ton et le format original. Respond in French.",
  };

  return prompts[language] || prompts.en;
}

export async function getLanguageConfig() {
  const result = await chrome.storage.local.get(LANGUAGE_KEY);
  return result[LANGUAGE_KEY] || 'auto';
}

export async function setLanguageConfig(language) {
  await chrome.storage.local.set({ [LANGUAGE_KEY]: language });
}

export function getSupportedLanguages() {
  return { ...SUPPORTED_LANGUAGES };
}
