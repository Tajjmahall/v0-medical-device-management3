/**
 * Manually extracts maintenance tasks from the Mindray manual text
 * @returns {Object} Extracted maintenance plan
 */
export function extractMindrayMaintenancePlan() {
  // This function creates a maintenance plan based on the OCR text from the Mindray manual
  return {
    daily: [
      "Clean the system - Before cleaning, turn off power and disconnect power cord from outlet",
      "Clean transducer according to transducer manual",
      "Clean transducer cable - Use soft dry cloth to wipe off stains",
      "Clean monitor - Use soft cloth with clean water or soapy water, allow to air-dry",
    ],
    weekly: [],
    monthly: [
      "Clean the dust nets at the system's left side and right side ventilation openings",
      "Disassemble, clean, and reinstall the dust nets",
    ],
    quarterly: [],
    biannual: [],
    annual: [],
    asNeeded: [
      "Backup the system hard disk to prevent data loss",
      "Replace power supply when necessary",
      "Replace CMOS battery when necessary",
      "If system is used outdoors or in a dusty location, increase dust net cleaning frequency",
    ],
    battery: ["Replace CMOS battery when necessary"],
    serviceEngineer: [
      "Cleaning checks",
      "Electric safety checks (ground leakage current, enclosure leakage current, animal leakage current)",
      "Interior system checks",
      "Peripheral checks",
      "Mechanical safety checks (monitor mounting, control panel, peripheral mounting, other mechanical parts)",
      "Transducer external appearance checks",
      "ECG lead external appearance checks",
      "Image recording checks",
    ],
    warnings: [
      "Only an authorized Mindray service engineer can perform maintenance not specified in the operator's manual",
      "For system performance and safety, perform periodical checks",
      "Before cleaning the system, turn off power and disconnect power cord to avoid electric shock",
      "Do not use hydrocarbon cleaner on the monitor as it may cause deterioration",
      "Do not spill water or liquid into the system while cleaning to avoid malfunction or electric shock",
      "Contact Mindray Customer Service to clean transducer connectors and TGC sliders",
    ],
    parts: [
      {
        name: "Dust Nets",
        location: "Left and right side ventilation openings",
        cleaningInterval: "Monthly",
        replacementInterval: "As needed when damaged",
      },
      {
        name: "Power Supply",
        replacementInterval: "As needed when malfunctioning",
      },
      {
        name: "CMOS Battery",
        replacementInterval: "As needed when depleted",
      },
    ],
  }
}

export default {
  extractMindrayMaintenancePlan,
}
