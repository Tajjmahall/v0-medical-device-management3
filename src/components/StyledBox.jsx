"use client"

const StyledBox = ({ children, style, urgency, ...rest }) => {
  // Choose colors based on urgency
  const baseColor =
    urgency === "Critical"
      ? "#dc3545"
      : // red
        urgency === "High"
        ? "#fd7e14"
        : // orange
          urgency === "Medium"
          ? "#ffc107"
          : // yellow
            urgency === "Low"
            ? "#28a745"
            : // green
              "#007bff" // default blue

  const hoverShadow =
    urgency === "Critical"
      ? "rgba(220, 53, 69, 0.2)"
      : urgency === "High"
        ? "rgba(253, 126, 20, 0.2)"
        : urgency === "Medium"
          ? "rgba(255, 193, 7, 0.2)"
          : urgency === "Low"
            ? "rgba(40, 167, 69, 0.2)"
            : "rgba(0, 123, 255, 0.2)"

  const defaultShadow =
    urgency === "Critical"
      ? "rgba(220, 53, 69, 0.1)"
      : urgency === "High"
        ? "rgba(253, 126, 20, 0.1)"
        : urgency === "Medium"
          ? "rgba(255, 193, 7, 0.1)"
          : urgency === "Low"
            ? "rgba(40, 167, 69, 0.1)"
            : "rgba(0, 123, 255, 0.1)"

  return (
    <div
      {...rest}
      style={{
        padding: "clamp(1rem, 2vw, 1.5rem)",
        margin: "15px 0",
        background: "rgba(255, 255, 255, 0.85)",
        borderLeft: `5px solid ${baseColor}`,
        borderRadius: "12px",
        boxShadow: `0 4px 12px ${defaultShadow}`,
        backdropFilter: "blur(6px)",
        transition: "transform 0.2s ease, box-shadow 0.3s ease",
        cursor: "default",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)"
        e.currentTarget.style.boxShadow = `0 6px 18px ${hoverShadow}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)"
        e.currentTarget.style.boxShadow = `0 4px 12px ${defaultShadow}`
      }}
    >
      {children}
    </div>
  )
}

export default StyledBox
