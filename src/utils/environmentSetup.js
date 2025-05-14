// Environment variable setup for OpenAI
export function checkOpenAIApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY environment variable is not set")
    return false
  }
  return true
}

// Safely get the API key without exposing it
export function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY
}

// Check if the API key is valid (basic format check)
export function isValidApiKey(apiKey) {
  // OpenAI API keys typically start with "sk-" and are 51 characters long
  return apiKey && apiKey.startsWith("sk-") && apiKey.length > 40
}
