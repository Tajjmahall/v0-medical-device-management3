// AI provider configuration
const AI_PROVIDERS = {
  OPENAI: "openai",
  GROK: "grok",
}

// Current AI provider - using OpenAI
const CURRENT_PROVIDER = AI_PROVIDERS.OPENAI

// Model configurations
const AI_MODELS = {
  [AI_PROVIDERS.OPENAI]: {
    default: "gpt-4o", // Updated to gpt-4o
    fallback: "gpt-3.5-turbo",
  },
  [AI_PROVIDERS.GROK]: {
    default: "grok-2",
    fallback: "grok-1",
  },
}

// Get the current model to use
function getCurrentModel() {
  return AI_MODELS[CURRENT_PROVIDER].default
}

// Get the fallback model if the primary fails
function getFallbackModel() {
  return AI_MODELS[CURRENT_PROVIDER].fallback
}

// Check which provider is currently active
function isUsingOpenAI() {
  return CURRENT_PROVIDER === AI_PROVIDERS.OPENAI
}

function isUsingGrok() {
  return CURRENT_PROVIDER === AI_PROVIDERS.GROK
}

export { AI_PROVIDERS, CURRENT_PROVIDER, getCurrentModel, getFallbackModel, isUsingOpenAI, isUsingGrok }
