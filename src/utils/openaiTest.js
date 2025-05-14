import OpenAI from "openai"

// Initialize the OpenAI client with the API key
const openai = new OpenAI({
  apiKey:
    "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",
})

/**
 * Tests the OpenAI connection by sending a simple request
 * @returns {Promise<Object>} The response from OpenAI
 */
export async function testOpenAIConnection() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      store: true,
      messages: [{ role: "user", content: "write a haiku about medical devices" }],
    })

    return completion.choices[0].message
  } catch (error) {
    console.error("OpenAI test error:", error)
    throw error
  }
}

export default {
  testOpenAIConnection,
}
