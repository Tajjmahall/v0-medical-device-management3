"use server"
import OpenAI from "openai"

// Initialize the OpenAI client with the API key
const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY ||
    "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",
})

/**
 * Extracts maintenance plan from PDF text using OpenAI
 * @param {string} pdfText - The text content of the PDF
 * @param {string} deviceId - The ID of the device (to ensure uniqueness)
 * @returns {Promise<Object>} The extracted maintenance plan
 */
export async function extractMaintenancePlan(pdfText, deviceId = null) {
  try {
    console.log(`Extracting maintenance plan for device ID: ${deviceId || "unknown"}`)

    // System prompt for maintenance plan extraction
    const systemPrompt = `You are a medical device maintenance expert. Extract the maintenance schedule from the provided manual text.

Return a JSON object with the following structure:

{
  "schedule": [
    {"frequency": "Per Use", "tasks": "task description", "pageReference": "page or section"},
    {"frequency": "Daily", "tasks": "task description", "pageReference": "page or section"},
    {"frequency": "Quarterly", "tasks": "task description", "pageReference": "page or section"},
    {"frequency": "As Needed", "tasks": "task description", "pageReference": "page or section"}
  ],
  "parts": [
    {"name": "part name", "replacementInterval": "interval", "pageReference": "page or section"}
  ],
  "warnings": [
    {"text": "warning text", "pageReference": "page or section"}
  ],
  "safetyPrecautions": "safety precautions text",
  "safetyPrecautionsPageReference": "page or section",
  "additionalNotes": "additional notes text",
  "additionalNotesPageReference": "page or section"
}

Important:
- Do NOT invent tasks or assign frequencies that are not explicitly mentioned.
- ONLY use these frequencies: Per Use, Daily, Weekly, Monthly, Quarterly, Yearly, As Needed.
- If the frequency is not mentioned, place the task under "As Needed" only if it's clearly conditional.
- Use exact wording from the manual for each task.
- Include battery tasks ONLY if the manual mentions battery usage.
- Do not mention "calibration" unless it is explicitly stated in the manual.
- Do not create fixed intervals like "every 6 months" unless the manual specifies it clearly.
- If the manual lists specific steps (e.g., multiple inspection points), include each one individually as a checklist.
- Never make up task descriptions. Only include actions explicitly listed in the manual text.
- Do not add section numbers unless they appear clearly in the manual.
- If a replacement interval says "as needed" or "when performance drops", do not convert it into a fixed schedule like "every 6 months".
- Be careful not to repeat or duplicate words like "Replace every Replace...".`

    const maxLength = 15000
    const truncatedText =
      pdfText.length > maxLength ? pdfText.substring(0, maxLength) + "... [text truncated due to length]" : pdfText

    // Create a unique request ID to ensure no context is shared between requests
    const requestId = `device_${deviceId || Math.random().toString(36).substring(2, 9)}_${Date.now()}`

    console.log(`Creating new extraction request with ID: ${requestId}`)

    // Make a completely fresh API call with no shared context
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Extract the maintenance plan from this medical device manual:

${truncatedText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
      user: requestId, // Add a unique user ID to ensure no context sharing
    })

    const responseContent = completion.choices[0].message.content
    console.log(`Received response for request ID: ${requestId}`)

    // Extract JSON from the response
    let jsonStr = ""
    const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) || responseContent.match(/{[\s\S]*}/)

    if (jsonMatch) {
      jsonStr = jsonMatch[1] || jsonMatch[0]
    } else {
      throw new Error("No JSON found in the response")
    }

    let maintenancePlan
    try {
      // Clean up the JSON string - remove any markdown code block markers
      jsonStr = jsonStr.replace(/```json|```/g, "").trim()
      maintenancePlan = JSON.parse(jsonStr)
    } catch (error) {
      console.error("Error parsing JSON response:", error)
      throw new Error(`Failed to parse JSON: ${error.message}`)
    }

    // Add defaults if needed
    if (!maintenancePlan.schedule) maintenancePlan.schedule = []
    if (!maintenancePlan.parts) maintenancePlan.parts = []
    if (!maintenancePlan.warnings) maintenancePlan.warnings = []
    if (!maintenancePlan.safetyPrecautions) {
      maintenancePlan.safetyPrecautions = "Always follow manufacturer safety guidelines when performing maintenance."
    }

    return maintenancePlan
  } catch (error) {
    console.error("Error in extractMaintenancePlan:", error)
    return { error: `Extraction failed: ${error.message}` }
  }
}

/**
 * Tests the OpenAI connection
 * @returns {Promise<Object>} The test result
 */
export async function testOpenAIConnection() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Test the OpenAI connection. Respond with 'Connection successful!'" },
      ],
    })

    return {
      success: true,
      content: completion.choices[0].message.content,
    }
  } catch (error) {
    console.error("OpenAI connection test failed:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Manually extracts maintenance tasks for Mindray devices
 * @param {string} deviceId - The ID of the device (to ensure uniqueness)
 * @returns {Promise<Object>} Extracted maintenance plan
 */
export async function extractMindrayMaintenancePlan(deviceId = null) {
  console.log(`Extracting Mindray maintenance plan for device ID: ${deviceId || "unknown"}`)

  // This function creates a maintenance plan based on the OCR text from the Mindray manual
  return {
    schedule: [
      {
        frequency: "Daily",
        tasks: "Clean the system - Before cleaning, turn off power and disconnect power cord from outlet",
        pageReference: "Cleaning",
      },
      { frequency: "Daily", tasks: "Clean transducer according to transducer manual", pageReference: "Cleaning" },
      {
        frequency: "Daily",
        tasks: "Clean transducer cable - Use soft dry cloth to wipe off stains",
        pageReference: "Cleaning",
      },
      {
        frequency: "Daily",
        tasks: "Clean monitor - Use soft cloth with clean water or soapy water, allow to air-dry",
        pageReference: "Cleaning",
      },
      {
        frequency: "Monthly",
        tasks: "Clean the dust nets at the system's left side and right side ventilation openings",
        pageReference: "Maintenance",
      },
      { frequency: "Monthly", tasks: "Disassemble, clean, and reinstall the dust nets", pageReference: "Maintenance" },
      {
        frequency: "As Needed",
        tasks: "Backup the system hard disk to prevent data loss",
        pageReference: "Data Management",
      },
      { frequency: "As Needed", tasks: "Replace power supply when necessary", pageReference: "Maintenance" },
      { frequency: "As Needed", tasks: "Replace CMOS battery when necessary", pageReference: "Maintenance" },
      {
        frequency: "As Needed",
        tasks: "If system is used outdoors or in a dusty location, increase dust net cleaning frequency",
        pageReference: "Maintenance",
      },
    ],
    parts: [
      { name: "Dust Nets", replacementInterval: "As needed when damaged", pageReference: "Maintenance" },
      { name: "Power Supply", replacementInterval: "As needed when malfunctioning", pageReference: "Maintenance" },
      { name: "CMOS Battery", replacementInterval: "As needed when depleted", pageReference: "Maintenance" },
    ],
    warnings: [
      {
        text: "Only an authorized Mindray service engineer can perform maintenance not specified in the operator's manual",
        pageReference: "Safety",
      },
      { text: "For system performance and safety, perform periodical checks", pageReference: "Safety" },
      {
        text: "Before cleaning the system, turn off power and disconnect power cord to avoid electric shock",
        pageReference: "Safety",
      },
      { text: "Do not use hydrocarbon cleaner on the monitor as it may cause deterioration", pageReference: "Safety" },
      {
        text: "Do not spill water or liquid into the system while cleaning to avoid malfunction or electric shock",
        pageReference: "Safety",
      },
      {
        text: "Contact Mindray Customer Service to clean transducer connectors and TGC sliders",
        pageReference: "Safety",
      },
    ],
    safetyPrecautions:
      "Always follow manufacturer safety guidelines when performing maintenance. Disconnect power before servicing. Use appropriate personal protective equipment (PPE).",
    safetyPrecautionsPageReference: "Safety Information",
    additionalNotes: "Maintenance should be performed by qualified personnel. Keep detailed maintenance records.",
    additionalNotesPageReference: "Maintenance Information",
  }
}
