const HospitalDeviceDetailsPage = ({ device }) => {
  return (
    <div style={{ padding: "30px" }}>
      <h2>{device.name}</h2>

      <div style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}>
        {/* Device Image */}
        <div style={{ width: "250px" }}>
          <img
            src={device.imageUrl || "https://via.placeholder.com/250x200?text=No+Image"}
            alt="Device"
            style={{ width: "100%", height: "auto", borderRadius: "8px", border: "1px solid #ccc" }}
          />
        </div>

        {/* Box 1: Core Details */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              background: "#f9f9f9",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "1px solid #ccc",
            }}
          >
            <h3>Core Details</h3>
            <p>
              <strong>Model:</strong> {device.model}
            </p>
            <p>
              <strong>Serial Number:</strong> {device.serialNumber}
            </p>
            <p>
              <strong>Status:</strong> {device.status}
            </p>
            <p>
              <strong>Category:</strong> {device.category}
            </p>
            <p>
              <strong>Supplier:</strong> {device.supplier}
            </p>
            <p>
              <strong>Assigned To:</strong> {device.assignedTo}
            </p>
          </div>

          {/* 🔜 Boxes 2-4 go here next steps */}
        </div>
      </div>
    </div>
  )
}

export default HospitalDeviceDetailsPage
