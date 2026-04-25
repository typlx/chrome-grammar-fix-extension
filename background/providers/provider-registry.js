import * as openai from './openai-provider.js';
import * as anthropic from './anthropic-provider.js';

const providers = { openai, anthropic };

export function getProvider(providerId) {
  return providers[providerId] || null;
}

export function getDefaultProvider() {
  return providers.openai;
}

export function getAllProviders() {
  return Object.values(providers);
}

export function getProviderIds() {
  return Object.keys(providers);
}

export function getProviderList() {
  return Object.values(providers).map((p) => ({
    id: p.id,
    displayName: p.displayName,
    configFields: p.configFields,
    defaults: p.defaults,
  }));
}
