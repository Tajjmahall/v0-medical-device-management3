"use client"

import { useState, useEffect } from "react"
import StyledBox from "./StyledBox"
import StyledButton from "./StyledButton"
import { db } from "../firebaseConfig"
import { doc, setDoc, getDoc } from "firebase/firestore"
import MaintenancePlanExtractor from "./MaintenancePlanExtractor"
import MaintenanceChecklist from "./MaintenanceChecklist"

const HospitalDevicePage = ({ device, onBack, showToast, updateDeviceInFirebase }) => {
  const [editing, setEditing] = useState(false)
  const [extraInfo, setExtraInfo] = useState(device.extraInfo || {})
  const [lastEdited, setLastEdited] = useState(device.lastEdited || null)
  const [activeTab, setActiveTab] = useState("details")
  const [maintenancePlan, setMaintenancePlan] = useState(device.maintenancePlan || null)
  const [maintenanceHistory, setMaintenanceHistory] = useState(device.maintenanceHistory || [])
  const [currentDevice, setCurrentDevice] = useState(device)
  const [deviceId, setDeviceId] = useState(device?.id || null)

  // Fetch the latest device data when the component mounts or device changes
  useEffect(() => {
    // Check if device ID has changed
    if (device?.id !== deviceId) {
      console.log(`HospitalDevicePage: Device changed from ${deviceId} to ${device?.id} - resetting state`)

      // Reset state for the new device
      setDeviceId(device?.id)
      setMaintenancePlan(device.maintenancePlan || null)
      setExtraInfo(device.extraInfo || {})
      setLastEdited(device.lastEdited || null)
      setMaintenanceHistory(device.maintenanceHistory || [])
      setCurrentDevice(device)

      // Fetch latest data for the new device
      fetchLatestDeviceData(device.id)
    }
  }, [device, deviceId])

  const fetchLatestDeviceData = async (id) => {
    try {
      console.log(`Fetching latest data for device ID: ${id}`)
      const docRef = doc(db, "Devices", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const latestData = { ...docSnap.data(), id: id }
        setCurrentDevice(latestData)
        setMaintenancePlan(latestData.maintenancePlan || null)
        setExtraInfo(latestData.extraInfo || {})
        setLastEdited(latestData.lastEdited || null)
        setMaintenanceHistory(latestData.maintenanceHistory || [])
        console.log(`Successfully fetched latest data for device ID: ${id}`)
      }
    } catch (error) {
      console.error(`Error fetching latest device data for ID ${id}:`, error)
    }
  }

  const handleSave = async () => {
    const now = new Date().toISOString()
    const updated = {
      ...currentDevice,
      extraInfo,
      lastEdited: {
        by: currentDevice.assignedTo,
        at: now,
      },
    }

    try {
      await setDoc(doc(db, "Devices", updated.id), updated)
      setCurrentDevice(updated)
      showToast("Device info updated!", "success")
      setEditing(false)
      setLastEdited(updated.lastEdited)
    } catch (error) {
      console.error("Failed to update device info:", error)
      showToast("Failed to update device info", "error")
    }
  }

  /**
   * Helper function to ensure a complete maintenance plan with all required categories
   * @param {Object} plan - The extracted maintenance plan
   * @returns {Object} - The enhanced maintenance plan
   */
  function ensureCompleteMaintenancePlan(plan) {
    if (!plan) return null

    // Initialize missing arrays if needed
    if (!plan.schedule) plan.schedule = []
    if (!plan.parts) plan.parts = []
    if (!plan.warnings) plan.warnings = []

    // Create a set of existing task descriptions to prevent duplicates
    const existingTaskDescriptions = new Set(plan.schedule.map((item) => item.tasks.toLowerCase()))

    // Track frequencies that exist in the plan
    const frequencies = new Set(plan.schedule.map((item) => item.frequency.toLowerCase()))

    // Add "Per Use" category if not present
    if (!frequencies.has("per use")) {
      // Check if there's a switch-on test mentioned elsewhere that we can move
      const switchOnTestIndex = plan.schedule.findIndex(
        (item) =>
          item.tasks.toLowerCase().includes("switch-on test") ||
          item.tasks.toLowerCase().includes("switch on test") ||
          item.tasks.toLowerCase().includes("power on test"),
      )

      if (switchOnTestIndex >= 0) {
        // Move the existing switch-on test to "Per Use" category
        const switchOnTest = plan.schedule[switchOnTestIndex]
        plan.schedule[switchOnTestIndex] = {
          ...switchOnTest,
          frequency: "Per Use",
        }
      } else if (!existingTaskDescriptions.has("check if the equipment can be switched on properly")) {
        // Add a default switch-on test if none exists
        plan.schedule.push({
          frequency: "Per Use",
          tasks: "Check if the equipment can be switched on properly. Verify all functions work correctly.",
          pageReference: "Switch-On Test",
        })
      }
    }

    // FIXED: Only add battery-related tasks if the device actually has a battery
    // Check if the device has any battery-related terms in its name, model, or category
    const deviceText = `${currentDevice.name} ${currentDevice.model} ${currentDevice.category}`.toLowerCase()
    const hasBattery =
      deviceText.includes("battery") ||
      plan.schedule.some((item) => item.tasks.toLowerCase().includes("battery")) ||
      plan.parts.some((part) => part.name.toLowerCase().includes("battery"))

    // Only add battery maintenance tasks if the device has a battery
    if (hasBattery) {
      // Check for battery maintenance tasks
      const hasBatteryFunctionalTest = plan.schedule.some(
        (item) => item.tasks.toLowerCase().includes("battery") && item.tasks.toLowerCase().includes("functional test"),
      )

      const hasBatteryPerformanceTest = plan.schedule.some(
        (item) => item.tasks.toLowerCase().includes("battery") && item.tasks.toLowerCase().includes("performance test"),
      )

      const hasBatteryOptimization = plan.schedule.some(
        (item) =>
          item.tasks.toLowerCase().includes("battery") &&
          (item.tasks.toLowerCase().includes("optimization") || item.tasks.toLowerCase().includes("optimize")),
      )

      // Add missing battery maintenance tasks only if the device has a battery
      if (!hasBatteryFunctionalTest) {
        plan.schedule.push({
          frequency: "As Needed",
          tasks: "Perform battery functional test when first installed or when the battery is replaced.",
          pageReference: "Battery Maintenance",
        })
      }

      if (!hasBatteryPerformanceTest) {
        plan.schedule.push({
          frequency: "Quarterly",
          tasks:
            "Perform battery performance test every three months or when the battery runtime is reduced significantly.",
          pageReference: "Battery Maintenance",
        })
      }

      if (!hasBatteryOptimization) {
        plan.schedule.push({
          frequency: "Quarterly",
          tasks:
            "Optimize the battery every three months to maintain capacity and accuracy of remaining runtime indication.",
          pageReference: "Battery Maintenance",
        })
      }
    }

    // Process "as needed" tasks and move them to the appropriate category
    plan.schedule.forEach((item, index) => {
      const taskLower = item.tasks.toLowerCase()
      if (
        (taskLower.includes("as needed") || taskLower.includes("when needed") || taskLower.includes("if needed")) &&
        item.frequency.toLowerCase() !== "as needed" &&
        item.frequency.toLowerCase() !== "other"
      ) {
        // Change the frequency to "As Needed" for clarity
        plan.schedule[index].frequency = "As Needed"
      }
    })

    // Also check parts that need replacement "as needed"
    if (plan.parts) {
      plan.parts.forEach((part, index) => {
        const replacementLower = part.replacementInterval.toLowerCase()
        if (
          replacementLower.includes("as needed") ||
          replacementLower.includes("when needed") ||
          replacementLower.includes("if needed")
        ) {
          // Create a task for this part in the "As Needed" category
          if (
            !existingTaskDescriptions.has(
              `replace ${part.name.toLowerCase()} ${part.replacementInterval.toLowerCase()}`,
            )
          ) {
            plan.schedule.push({
              frequency: "As Needed",
              tasks: `Replace ${part.name} ${part.replacementInterval}`,
              pageReference: part.pageReference || "Parts Replacement",
            })
          }
        }
      })
    }

    // Ensure safety precautions exist
    if (!plan.safetyPrecautions) {
      plan.safetyPrecautions =
        "Always follow manufacturer safety guidelines when performing maintenance. Disconnect power before servicing. Use appropriate personal protective equipment (PPE)."
      plan.safetyPrecautionsPageReference = "Safety Information"
    }

    // Ensure additional notes exist
    if (!plan.additionalNotes) {
      plan.additionalNotes = `Maintenance should be performed by qualified personnel. Keep detailed maintenance records for ${currentDevice.name} ${currentDevice.model}.`
      plan.additionalNotesPageReference = "Maintenance Information"
    }

    // Ensure warnings array exists
    if (!plan.warnings || !Array.isArray(plan.warnings)) {
      plan.warnings = [
        {
          text: "Always refer to the manufacturer's manual for complete safety information and warnings.",
          pageReference: "Safety Information",
        },
      ]
    }

    return plan
  }

  const handleSavePlan = async (plan) => {
    const now = new Date().toISOString()

    // Apply the enhanced post-processing to ensure a complete plan
    const enhancedPlan = ensureCompleteMaintenancePlan(plan)

    const updated = {
      ...currentDevice,
      maintenancePlan: enhancedPlan,
      lastEdited: {
        by: currentDevice.assignedTo,
        at: now,
      },
    }

    try {
      console.log(`Saving maintenance plan for device ID: ${updated.id}`)
      await setDoc(doc(db, "Devices", updated.id), updated)
      setCurrentDevice(updated)
      setMaintenancePlan(enhancedPlan)
      showToast("Maintenance plan saved successfully!", "success")
    } catch (error) {
      console.error("Failed to save maintenance plan:", error)
      showToast("Failed to save maintenance plan", "error")
    }
  }

  const TabButton = ({ label, tabId }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      style={{
        padding: "10px 15px",
        background: activeTab === tabId ? "#007bff" : "#f0f0f0",
        color: activeTab === tabId ? "white" : "#333",
        border: "none",
        borderRadius: "5px 5px 0 0",
        cursor: "pointer",
        marginRight: "5px",
        fontWeight: activeTab === tabId ? "bold" : "normal",
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding: "30px" }}>
      <StyledButton onClick={onBack}>← Back</StyledButton>

      <h2>
        {currentDevice.name} ({currentDevice.model})
      </h2>

      {/* Display device ID for debugging */}
      <p style={{ fontSize: "12px", color: "#666" }}>Device ID: {currentDevice.id}</p>

      {/* Top-Right Image */}
      <div style={{ float: "right", width: "150px", height: "150px", background: "#eee", marginBottom: "20px" }}>
        {/* Placeholder for image */}
        <p style={{ textAlign: "center", lineHeight: "150px" }}>Device Image</p>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <TabButton label="Device Details" tabId="details" />
        <TabButton label="Maintenance Plan" tabId="maintenance" />
        <TabButton label="Maintenance Checklist" tabId="checklist" />
        <TabButton label="Files & Documents" tabId="files" />
        <TabButton label="Comments" tabId="comments" />
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <>
          {/* Box 1: General Info */}
          <StyledBox>
            <h3>Device Details</h3>
            <p>
              <strong>Serial Number:</strong> {currentDevice.serialNumber}
            </p>
            <p>
              <strong>Status:</strong> {currentDevice.status}
            </p>
            <p>
              <strong>Supplier:</strong> {currentDevice.supplier}
            </p>
            <p>
              <strong>Category:</strong> {currentDevice.category}
            </p>
            <p>
              <strong>Last Maintenance:</strong> {currentDevice.lastMaintenance}
            </p>
            <p>
              <strong>Next Maintenance:</strong> {currentDevice.nextMaintenance}
            </p>
          </StyledBox>

          {/* Box 2: Further Info (editable) */}
          <StyledBox>
            <h3>Further Information</h3>
            {editing ? (
              <>
                <textarea
                  placeholder="Location"
                  value={extraInfo.location || ""}
                  onChange={(e) => setExtraInfo({ ...extraInfo, location: e.target.value })}
                  style={{ width: "100%", marginBottom: "10px" }}
                />
                <textarea
                  placeholder="Installation Date"
                  value={extraInfo.installationDate || ""}
                  onChange={(e) => setExtraInfo({ ...extraInfo, installationDate: e.target.value })}
                  style={{ width: "100%", marginBottom: "10px" }}
                />
                <textarea
                  placeholder="Room Number"
                  value={extraInfo.room || ""}
                  onChange={(e) => setExtraInfo({ ...extraInfo, room: e.target.value })}
                  style={{ width: "100%", marginBottom: "10px" }}
                />
                <StyledButton onClick={handleSave}>Save</StyledButton>
              </>
            ) : (
              <>
                <p>
                  <strong>Location:</strong> {extraInfo.location || "—"}
                </p>
                <p>
                  <strong>Installation Date:</strong> {extraInfo.installationDate || "—"}
                </p>
                <p>
                  <strong>Room:</strong> {extraInfo.room || "—"}
                </p>
                {lastEdited && (
                  <p>
                    <em>
                      Last edited by {lastEdited.by} on {new Date(lastEdited.at).toLocaleString()}
                    </em>
                  </p>
                )}
                <StyledButton onClick={() => setEditing(true)}>✏️ Edit</StyledButton>
              </>
            )}
          </StyledBox>
        </>
      )}

      {activeTab === "maintenance" && (
        <>
          {maintenancePlan ? (
            <div>
              <StyledBox>
                <h3>Maintenance Plan</h3>
                <div
                  style={{
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    background: "#f9f9fa",
                  }}
                >
                  <h4>Recommended Maintenance Schedule</h4>

                  {/* Group maintenance tasks by frequency for better organization */}
                  {["Per Use", "Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "As Needed", "Other"].map(
                    (frequency) => {
                      const items = maintenancePlan.schedule.filter(
                        (item) => item.frequency.toLowerCase() === frequency.toLowerCase(),
                      )

                      if (items.length === 0) return null

                      return (
                        <div key={frequency} style={{ marginBottom: "15px" }}>
                          <h5
                            style={{
                              marginTop: "15px",
                              marginBottom: "10px",
                              padding: "5px 10px",
                              backgroundColor: "#e9ecef",
                              borderRadius: "4px",
                            }}
                          >
                            {frequency} Tasks
                          </h5>
                          <ul>
                            {items.map((item, index) => (
                              <li key={index}>
                                {item.tasks}
                                {item.pageReference && item.pageReference !== "Not specified in document" && (
                                  <span style={{ color: "#0056b3", fontSize: "0.85em", marginLeft: "5px" }}>
                                    [{item.pageReference}]
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    },
                  )}

                  <h4>Parts That Need Regular Replacement</h4>
                  <ul>
                    {maintenancePlan.parts.map((part, index) => (
                      <li key={index}>
                        <strong>{part.name}:</strong> Replace every {part.replacementInterval}
                        {part.pageReference && part.pageReference !== "Not specified in document" && (
                          <span style={{ color: "#0056b3", fontSize: "0.85em", marginLeft: "5px" }}>
                            [{part.pageReference}]
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <h4>Safety Precautions</h4>
                  <p>
                    {maintenancePlan.safetyPrecautions}
                    {maintenancePlan.safetyPrecautionsPageReference &&
                      maintenancePlan.safetyPrecautionsPageReference !== "Not specified in document" && (
                        <span style={{ color: "#0056b3", fontSize: "0.85em", marginLeft: "5px" }}>
                          [{maintenancePlan.safetyPrecautionsPageReference}]
                        </span>
                      )}
                  </p>

                  {maintenancePlan.additionalNotes && (
                    <>
                      <h4>Additional Notes</h4>
                      <p>
                        {maintenancePlan.additionalNotes}
                        {maintenancePlan.additionalNotesPageReference &&
                          maintenancePlan.additionalNotesPageReference !== "Not specified in document" && (
                            <span style={{ color: "#0056b3", fontSize: "0.85em", marginLeft: "5px" }}>
                              [{maintenancePlan.additionalNotesPageReference}]
                            </span>
                          )}
                      </p>
                    </>
                  )}
                </div>

                <div style={{ marginTop: "15px" }}>
                  <StyledButton onClick={() => setMaintenancePlan(null)}>Generate New Plan</StyledButton>
                </div>
              </StyledBox>

              {/* Warnings and Cautions Box */}
              {maintenancePlan.warnings && maintenancePlan.warnings.length > 0 && (
                <StyledBox>
                  <h3>Warnings & Cautions</h3>
                  <div
                    style={{
                      padding: "15px",
                      border: "1px solid #dc3545",
                      borderRadius: "5px",
                      background: "#fff8f8",
                    }}
                  >
                    <ul style={{ listStyleType: "none", padding: 0 }}>
                      {maintenancePlan.warnings.map((warning, index) => (
                        <li
                          key={index}
                          style={{
                            marginBottom: "15px",
                            padding: "10px",
                            border: "1px solid #f5c6cb",
                            borderRadius: "4px",
                            backgroundColor: "#fff8f8",
                          }}
                        >
                          <div
                            style={{ fontWeight: warning.text.toLowerCase().includes("warning") ? "bold" : "normal" }}
                          >
                            {warning.text}
                          </div>
                          {warning.pageReference && warning.pageReference !== "Not specified in document" && (
                            <span style={{ color: "#0056b3", fontSize: "0.85em", marginTop: "5px", display: "block" }}>
                              Reference: [{warning.pageReference}]
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </StyledBox>
              )}
            </div>
          ) : (
            <MaintenancePlanExtractor device={currentDevice} onSavePlan={handleSavePlan} showToast={showToast} />
          )}
        </>
      )}

      {activeTab === "checklist" && (
        <MaintenanceChecklist
          device={currentDevice}
          maintenancePlan={maintenancePlan}
          maintenanceHistory={maintenanceHistory}
          setMaintenanceHistory={setMaintenanceHistory}
          showToast={showToast}
        />
      )}

      {activeTab === "files" && (
        <StyledBox>
          <h3>Files & Documents</h3>
          <p>📂 Upload device manuals, certifications, and other documents here.</p>

          <div style={{ marginTop: "15px" }}>
            <input type="file" style={{ display: "none" }} id="file-upload" />
            <label htmlFor="file-upload">
              <StyledButton as="span">Upload Document</StyledButton>
            </label>
          </div>

          <div style={{ marginTop: "20px" }}>
            <p>No documents uploaded yet.</p>
          </div>
        </StyledBox>
      )}

      {activeTab === "comments" && (
        <StyledBox>
          <h3>Comments</h3>
          {currentDevice.comments?.length > 0 ? (
            currentDevice.comments.map((comment, i) => (
              <div key={i} style={{ marginBottom: "10px", padding: "10px", borderBottom: "1px solid #eee" }}>
                <strong>{comment.user}</strong> - {comment.date}
                <br />
                {comment.text}
              </div>
            ))
          ) : (
            <p>No comments yet.</p>
          )}

          <div style={{ marginTop: "15px" }}>
            <textarea
              placeholder="Add a comment..."
              style={{ width: "100%", padding: "10px", minHeight: "80px", marginBottom: "10px" }}
            />
            <StyledButton>Add Comment</StyledButton>
          </div>
        </StyledBox>
      )}
    </div>
  )
}

export default HospitalDevicePage
