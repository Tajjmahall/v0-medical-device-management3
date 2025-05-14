"use client"

import { useState, useRef, useEffect } from "react"
import StyledBox from "./StyledBox"
import StyledButton from "./StyledButton"
import { extractMaintenancePlan, extractMindrayMaintenancePlan, testOpenAIConnection } from "../actions/ai-actions"

const MaintenancePlanExtractor = ({ device, onSavePlan, showToast }) => {
  const [file, setFile] = useState(null)
  const [extractedText, setExtractedText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showExtractedText, setShowExtractedText] = useState(false)
  const [deviceId, setDeviceId] = useState(device?.id || null)
  const fileInputRef = useRef(null)

  // Reset state when device changes
  useEffect(() => {
    // Check if device ID has changed
    if (device?.id !== deviceId) {
      console.log(`Device changed from ${deviceId} to ${device?.id} - resetting extractor state`)

      // Reset all state
      setFile(null)
      setExtractedText("")
      setError(null)
      setShowExtractedText(false)
      setDeviceId(device?.id)

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [device?.id, deviceId])

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) {
      // Clear previous data
      setExtractedText("")
      setFile(selectedFile)
      handleFileRead(selectedFile)
    }
  }

  const handleFileRead = (selectedFile) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setExtractedText(e.target.result)
    }
    reader.readAsText(selectedFile)
  }

  const handleExtract = async () => {
    if (!extractedText) {
      showToast("Please upload a file first", "error")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Include device ID in the extraction request to ensure uniqueness
      const result = await extractMaintenancePlan(extractedText, device?.id)

      if (result.error) {
        setError(result.error)
        showToast(`Extraction error: ${result.error}`, "error")
      } else {
        onSavePlan(result)
        showToast("Maintenance plan extracted successfully!", "success")
      }
    } catch (err) {
      console.error("Error extracting maintenance plan:", err)
      setError("Error extracting maintenance plan. Please try again.")
      showToast("Failed to extract maintenance plan", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleExtractMindray = async () => {
    setLoading(true)
    try {
      // Include device ID in the extraction request to ensure uniqueness
      const plan = await extractMindrayMaintenancePlan(device?.id)
      onSavePlan(plan)
      showToast("Mindray maintenance plan extracted successfully!", "success")
    } catch (err) {
      console.error("Error extracting Mindray plan:", err)
      setError("Error extracting Mindray plan. Please try again.")
      showToast("Failed to extract Mindray plan", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleTestOpenAI = async () => {
    setLoading(true)
    try {
      const result = await testOpenAIConnection()
      showToast(`OpenAI Test: ${result.success ? "Success" : "Failed"}`, result.success ? "success" : "error")
    } catch (error) {
      console.error("OpenAI test error:", error)
      showToast(`OpenAI test failed: ${error.message}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const handleClearFile = () => {
    setFile(null)
    setExtractedText("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <StyledBox>
      <h3>Maintenance Plan Extractor for {device?.name || "Device"}</h3>
      <p>Upload the device manual to extract the maintenance plan using OpenAI GPT-4o.</p>

      {/* Display current device ID for debugging */}
      <p style={{ fontSize: "12px", color: "#666" }}>Device ID: {device?.id || "None"}</p>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ marginBottom: "10px" }}
        />
        {file && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <p>File loaded: {file.name}</p>
            <StyledButton onClick={handleClearFile} type="danger" style={{ padding: "5px 10px", fontSize: "12px" }}>
              Clear File
            </StyledButton>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
        <StyledButton onClick={handleExtract} disabled={!extractedText || loading}>
          {loading ? "Extracting..." : "Extract Maintenance Plan"}
        </StyledButton>

        <StyledButton onClick={handleExtractMindray} type="secondary" disabled={loading}>
          Extract Mindray Plan
        </StyledButton>

        <StyledButton onClick={handleTestOpenAI} type="warning" disabled={loading}>
          Test OpenAI Connection
        </StyledButton>

        <StyledButton onClick={() => setShowExtractedText(!showExtractedText)} type="default" disabled={!extractedText}>
          {showExtractedText ? "Hide Extracted Text" : "Show Extracted Text"}
        </StyledButton>
      </div>

      {error && (
        <div style={{ color: "red", marginTop: "10px", padding: "10px", background: "#ffeeee", borderRadius: "5px" }}>
          {error}
        </div>
      )}

      {showExtractedText && extractedText && (
        <div style={{ marginTop: "20px" }}>
          <h4>Extracted Text</h4>
          <div
            style={{
              maxHeight: "300px",
              overflow: "auto",
              border: "1px solid #ccc",
              padding: "10px",
              marginTop: "10px",
              background: "#f9f9f9",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            {extractedText}
          </div>
        </div>
      )}
    </StyledBox>
  )
}

export default MaintenancePlanExtractor
