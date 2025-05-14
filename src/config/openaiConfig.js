// OpenAI configuration
const OPENAI_CONFIG = {
  // Available models
  MODELS: {
    GPT4O: "gpt-4o",
    GPT4O_MINI: "gpt-4o-mini",
    GPT35_TURBO: "gpt-3.5-turbo",
  },

  // Current model to use
  CURRENT_MODEL: "gpt-4o-mini",

  // Default parameters
  DEFAULT_PARAMS: {
    temperature: 0.1,
    max_tokens: 1500,
    store: true,
  },

  // System messages for different tasks
  SYSTEM_MESSAGES: {
    MAINTENANCE_EXTRACTION:
      "You are a medical device maintenance expert specialized in extracting maintenance schedules from technical manuals.",
    GENERAL: "You are an AI assistant helping with medical device management.",
  },
}

// Helper function to get the current model
export function getCurrentModel() {
  return OPENAI_CONFIG.CURRENT_MODEL
}

// Helper function to set a different model
export function setModel(modelName) {
  if (OPENAI_CONFIG.MODELS[modelName]) {
    OPENAI_CONFIG.CURRENT_MODEL = OPENAI_CONFIG.MODELS[modelName]
    return true
  }
  return false
}

// Export the configuration
export default OPENAI_CONFIG
