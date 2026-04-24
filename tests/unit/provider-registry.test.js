import { describe, it, expect } from 'vitest';
import {
  getProvider,
  getDefaultProvider,
  getAllProviders,
  getProviderIds,
  getProviderList,
} from '../../background/providers/provider-registry.js';

describe('provider-registry', () => {
  describe('looking up a provider by id', () => {
    it('returns the OpenAI provider when requested', () => {
      const provider = getProvider('openai');
      expect(provider).not.toBeNull();
      expect(provider.id).toBe('openai');
      expect(provider.fixGrammar).toBeTypeOf('function');
      expect(provider.validateConfig).toBeTypeOf('function');
    });

    it('returns the Anthropic provider when requested', () => {
      const provider = getProvider('anthropic');
      expect(provider).not.toBeNull();
      expect(provider.id).toBe('anthropic');
      expect(provider.fixGrammar).toBeTypeOf('function');
    });

    it('returns null for an unknown provider', () => {
      expect(getProvider('llama-local')).toBeNull();
    });
  });

  describe('default provider', () => {
    it('defaults to OpenAI', () => {
      const provider = getDefaultProvider();
      expect(provider.id).toBe('openai');
    });
  });

  describe('listing providers', () => {
    it('returns all registered provider modules', () => {
      const all = getAllProviders();
      expect(all.length).toBeGreaterThanOrEqual(2);
      const ids = all.map((p) => p.id);
      expect(ids).toContain('openai');
      expect(ids).toContain('anthropic');
    });

    it('returns provider ids as strings', () => {
      const ids = getProviderIds();
      expect(ids).toContain('openai');
      expect(ids).toContain('anthropic');
    });

    it('returns a serializable config list with display names and fields', () => {
      const list = getProviderList();
      expect(list.length).toBeGreaterThanOrEqual(2);

      const openai = list.find((p) => p.id === 'openai');
      expect(openai.displayName).toBe('OpenAI Compatible');
      expect(openai.configFields).toBeInstanceOf(Array);
      expect(openai.configFields.some((f) => f.key === 'token')).toBe(true);
      expect(openai.defaults).toHaveProperty('model');
    });
  });
});
