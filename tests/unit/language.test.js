import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectLanguage,
  getSystemPrompt,
  getLanguageConfig,
  setLanguageConfig,
  getSupportedLanguages,
} from '../../utils/language.js';

describe('language detection and multi-language groundwork', () => {
  beforeEach(() => {
    globalThis.__clearChromeStore();
  });

  describe('trigram-based language detection', () => {
    it('detects English text correctly', () => {
      const text =
        'The quick brown fox jumps over the lazy dog and then runs through the forest with great enthusiasm';
      expect(detectLanguage(text)).toBe('en');
    });

    it('detects Spanish text correctly', () => {
      const text =
        'El rápido zorro marrón salta sobre el perro perezoso y luego corre por el bosque con gran entusiasmo';
      expect(detectLanguage(text)).toBe('es');
    });

    it('detects French text correctly', () => {
      const text =
        'Le rapide renard brun saute par-dessus le chien paresseux et ensuite court dans la forêt avec un grand enthousiasme';
      expect(detectLanguage(text)).toBe('fr');
    });

    it('defaults to English for very short text', () => {
      expect(detectLanguage('hi')).toBe('en');
      expect(detectLanguage('')).toBe('en');
    });
  });

  describe('language-specific system prompts', () => {
    it('returns an English prompt for English', () => {
      const prompt = getSystemPrompt('en');
      expect(prompt).toContain('Fix grammar');
    });

    it('returns a Spanish prompt for Spanish', () => {
      const prompt = getSystemPrompt('es');
      expect(prompt).toContain('Corrige');
      expect(prompt).toContain('Spanish');
    });

    it('returns a French prompt for French', () => {
      const prompt = getSystemPrompt('fr');
      expect(prompt).toContain('Corrigez');
      expect(prompt).toContain('French');
    });

    it('falls back to English for unknown language codes', () => {
      const prompt = getSystemPrompt('de');
      expect(prompt).toContain('Fix grammar');
    });
  });

  describe('language configuration storage', () => {
    it('defaults to auto-detect when no language is configured', async () => {
      const lang = await getLanguageConfig();
      expect(lang).toBe('auto');
    });

    it('persists the selected language across reads', async () => {
      await setLanguageConfig('es');
      expect(await getLanguageConfig()).toBe('es');
    });

    it('can switch back to auto-detect', async () => {
      await setLanguageConfig('fr');
      await setLanguageConfig('auto');
      expect(await getLanguageConfig()).toBe('auto');
    });
  });

  describe('supported languages registry', () => {
    it('includes auto-detect and at least three languages', () => {
      const languages = getSupportedLanguages();
      expect(languages.auto).toBeDefined();
      expect(languages.en).toBeDefined();
      expect(languages.es).toBeDefined();
      expect(languages.fr).toBeDefined();
    });

    it('each language has a label and code', () => {
      const languages = getSupportedLanguages();
      for (const [code, info] of Object.entries(languages)) {
        expect(info.label).toBeTruthy();
        expect(info.code).toBe(code);
      }
    });
  });
});
