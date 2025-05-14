"use client"

import { useEffect, useRef } from "react"

const COLORS = {
  primary: "#0056b3",
  success: "#28a745",
  danger: "#dc3545",
  warning: "#ffc107",
  default: "#6c757d",
}

const HOVER_COLORS = {
  primary: "#003d80",
  success: "#1e7e34",
  danger: "#c82333",
  warning: "#e0a800",
  default: "#5a6268",
}

const Spinner = () => (
  <span
    style={{
      display: "inline-block",
      width: "14px",
      height: "14px",
      border: "2px solid white",
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      marginRight: "8px",
    }}
  />
)

const StyledButton = ({
  onClick,
  children,
  type = "primary",
  disabled = false,
  loading = false,
  icon = null,
  fullWidth = false,
}) => {
  const initialized = useRef(false)

  // Move the document manipulation inside useEffect to ensure it only runs in the browser
  useEffect(() => {
    if (!initialized.current) {
      // Check if the keyframes already exist to avoid duplicates
      const existingStyles = document.querySelectorAll("style")
      let keyframesExist = false

      for (let i = 0; i < existingStyles.length; i++) {
        if (existingStyles[i].textContent?.includes("@keyframes spin")) {
          keyframesExist = true
          break
        }
      }

      if (!keyframesExist) {
        // Create a new style element instead of modifying existing stylesheets
        const styleElement = document.createElement("style")
        styleElement.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
        document.head.appendChild(styleElement)
      }

      initialized.current = true
    }
  }, [])

  const baseColor = COLORS[type] || COLORS.default
  const hoverColor = HOVER_COLORS[type] || HOVER_COLORS.default

  return (
    <button
      onClick={!disabled && !loading ? onClick : null}
      style={{
        padding: "10px 20px",
        margin: "5px",
        background: disabled ? "#ccc" : baseColor,
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        transition: "background 0.3s, transform 0.1s, box-shadow 0.2s",
        boxShadow: disabled ? "none" : "0 2px 5px rgba(0,0,0,0.1)",
        width: fullWidth ? "100%" : "auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = "scale(0.95)"
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = "scale(1)"
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = "scale(1)"
          e.currentTarget.style.background = baseColor
        }
      }}
      onMouseOver={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = hoverColor
        }
      }}
    >
      {loading && <Spinner />}
      {icon && <span style={{ marginRight: "8px" }}>{icon}</span>}
      {children}
    </button>
  )
}

export default StyledButton
