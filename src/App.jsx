"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, doc, setDoc } from "firebase/firestore"
import { db } from "./firebaseConfig"
import StyledButton from "./components/StyledButton"
import { setLogLevel } from "firebase/firestore"
setLogLevel("debug")
import StyledBox from "./components/StyledBox"
import { COLORS, FONTS } from "./theme"
import "./global.css"
import HospitalDevicePage from "./components/HospitalDevicePage"

const updateRequestInFirebase = async (updatedRequest) => {
  try {
    const ref = doc(db, "Requests", updatedRequest.id)
    await setDoc(ref, updatedRequest)
    console.log("✅ Request synced to Firestore")
  } catch (error) {
    console.error("❌ Failed to sync request:", error)
  }
}

/* ------------------------------------------------------------------
 1️⃣  SAMPLE Categories
 ------------------------------------------------------------------ */

const deviceCategories = {
  imaging: "Imaging Equipment",
  diagnostic: "Diagnostic Equipment",
  monitoring: "Patient Monitoring",
  surgical: "Surgical Equipment",
  therapeutic: "Therapeutic Equipment",
  laboratory: "Laboratory Equipment",
}

// Sample notifications
const initialNotifications = [
  { id: "1", deviceId: "1", type: "maintenance", message: "Maintenance due in 5 days", read: false },
  { id: "2", deviceId: "8", type: "alert", message: "Device requires immediate attention", read: false },
]

const sampleMaintenanceLogs = []

export default function MedicalDeviceSystem() {
  const [supplierTab, setSupplierTab] = useState("pending")
  const [formErrors, setFormErrors] = useState([])
  const [activeTab, setActiveTab] = useState("inventory")
  const [technicianTab, setTechnicianTab] = useState("pending")
  const [technicianNotes, setTechnicianNotes] = useState("")
  const [accounts, setAccounts] = useState([])
  const [currentView, setCurrentView] = useState("login")
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [devices, setDevices] = useState([])
  const [maintenanceLogs, setMaintenanceLogs] = useState(sampleMaintenanceLogs)
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [notifications, setNotifications] = useState(initialNotifications)
  const [showDeviceDetails, setShowDeviceDetails] = useState(false)
  const [hospitalDevicePageDevice, setHospitalDevicePageDevice] = useState(null)
  const [newComment, setNewComment] = useState("")
  const [selectedHospitalView, setSelectedHospitalView] = useState("")
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [showNotifications, setShowNotifications] = useState(false)
  const hospitalAccounts = accounts.filter((acc) => acc.role === "hospital")
  const [deviceRequests, setDeviceRequests] = useState([])
  const [showAddDevice, setShowAddDevice] = useState(false)

  const [newRequestData, setNewRequestData] = useState({
    type: "",
    otherType: "",
    preferredDate: "",
    preferredWindow: "",
    recipients: [],
    status: "Pending",
    approvedDate: "",
    approvedTime: "",
    comment: "", // <-- Add this line
  })
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState("info") // 'success', 'error', 'info'

  const showToast = (message, type = "info") => {
    setToastMessage(message)
    setToastType(type)
    setTimeout(() => setToastMessage(""), 4000) // auto-dismiss
  }

  useEffect(() => {
    const fetchAccounts = async () => {
      const snapshot = await getDocs(collection(db, "Users"))
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAccounts(users)
    }

    fetchAccounts()
  }, [])

  // 🚀 FIREBASE SYNC: Fetch Devices from Firestore on App Load
  useEffect(() => {
    if (loggedInUser) {
      fetchDevices(loggedInUser)
      fetchRequests()
    }
  }, [loggedInUser])

  const fetchRequests = async () => {
    const snapshot = await getDocs(collection(db, "Requests"))
    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    setDeviceRequests(requests)
  }

  const fetchDevices = async (user) => {
    if (isAddingDevice || !user) return

    const devicesCollection = collection(db, "Devices")
    const devicesSnapshot = await getDocs(devicesCollection)
    const allDevices =
      devicesSnapshot?.docs?.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) || []

    // ✨ ROLE-BASED FILTERING
    let filteredDevices = []

    if (user.role === "hospital") {
      // hospital can only see their own devices
      filteredDevices = allDevices.filter((device) => device.assignedTo === user.name)
    } else if (user.role === "supplier") {
      // supplier can only see their own supplied devices
      filteredDevices = allDevices.filter((device) => device.supplier === user.name)
    } else if (user.role === "technician") {
      // technician can see all devices due for maintenance (let's say all for now)
      filteredDevices = allDevices
    }

    // Only set state if data actually changed
    const isSame = JSON.stringify(devices) === JSON.stringify(filteredDevices)
    if (!isSame) {
      setDevices(filteredDevices)
    }
  }

  // 🔚 End of FIREBASE SYNC: Fetch Devices

  //reusable saveDeviceToFirebase function
  const saveDeviceToFirebase = async (device) => {
    try {
      const docRef = await addDoc(collection(db, "Devices"), {
        ...device,
        history: [], // 🛠 Ensure these are present
        comments: [],
        createdAt: new Date().toISOString(),
      })
      return { ...device, id: docRef.id, history: [], comments: [] }
    } catch (error) {
      console.error("Firestore error:", error.code, error.message)
      throw error
    }
  }

  //end of reusable saveDeviceToFirebase function
  // ----------------------------
  // 🔧 Update device in Firebase
  // ----------------------------
  const updateDeviceInFirebase = async (updatedDevice) => {
    try {
      await setDoc(doc(db, "Devices", updatedDevice.id), updatedDevice)
      console.log("Device updated in Firebase")
    } catch (error) {
      console.error("Error updating device:", error)
    }
  }
  // ----------------------------
  // 🔧 END of Update device function
  // ----------------------------

  const [newDevice, setNewDevice] = useState({
    name: "",
    model: "",
    serialNumber: "",
    status: "active",
    lastMaintenance: new Date().toISOString().split("T")[0],
    nextMaintenance: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0],
    assignedTo: "",
    supplier: "",
    customSupplier: "",
    category: "",
  })
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [newMaintenanceDate, setNewMaintenanceDate] = useState("")
  const [requestRecipient, setRequestRecipient] = useState("")
  // Supplier Catalog States
  const [isAddingDevice, setIsAddingDevice] = useState(false)

  const [selectedCatalogDevice, setSelectedCatalogDevice] = useState(null)
  const [assignHospital, setAssignHospital] = useState("")
  const [assignHospitalOther, setAssignHospitalOther] = useState("")
  const [assignFrequency, setAssignFrequency] = useState("")

  const [newMaintenance, setNewMaintenance] = useState({
    deviceId: "",
    deviceName: "",
    technician: "",
    notes: "",
    status: "completed",
  })
  useEffect(() => {
    const cleanedRequests = deviceRequests.filter((req) => req.preferredDate)
    if (cleanedRequests.length !== deviceRequests.length) {
      setDeviceRequests(cleanedRequests)
    }
  }, [])

  const handleLogin = () => {
    const user = accounts.find((u) => u.username === loginForm.username && u.password === loginForm.password)
    if (user) {
      setLoggedInUser(user)
      setCurrentView("dashboard")
      setActiveTab(
        user.role === "hospital" ? "categories" : user.role === "supplier" ? "supplier_management" : "maintenance", // for technician only
      )

      setNewDevice((prev) => ({ ...prev, supplier: user.name }))

      // 👇 Add this line here
      fetchRequests()
    } else {
      showToast("Invalid username or password", "error")
    }
  }

  const handleAddDevice = () => {
    const device = { ...newDevice, id: (devices.length + 1).toString() }
    setShowAddDevice(false)
  }

  const handleAddMaintenance = () => {
    const log = {
      id: (maintenanceLogs.length + 1).toString(),
      deviceId: newMaintenance.deviceId,
      deviceName: newMaintenance.deviceName,
      date: new Date().toISOString().split("T")[0],
      technician: loggedInUser.name,
      notes: newMaintenance.notes,
      status: newMaintenance.status,
    }
    // ======================================
    // 🔧 Prepare updated device data (with new maintenance info)
    // ======================================

    const updatedDevice = {
      ...devices.find((d) => d.id === newMaintenance.deviceId),
      lastMaintenance: log.date,
      nextMaintenance: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0],
    }

    // ======================================
    // 🚀 Send the updated device to Firebase
    // ======================================

    updateDeviceInFirebase(updatedDevice)

    setMaintenanceLogs([...maintenanceLogs, log])

    setDevices(
      devices.map((d) =>
        d.id === newMaintenance.deviceId
          ? {
              ...d,
              lastMaintenance: log.date,
              nextMaintenance: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0],
            }
          : d,
      ),
    )

    setShowMaintenanceForm(false)
  }

  const handleRequestStatusChange = (id, newStatus) => {
    const updatedRequests = deviceRequests.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
    setDeviceRequests(updatedRequests)
    const updated = updatedRequests.find((req) => req.id === id)
    updateRequestInFirebase(updated)
  }

  /* ------------------------------------------------------------------
   2️⃣  REUSABLE UI HELPERS
   ------------------------------------------------------------------ */
  // Move this outside the MedicalDeviceSystem component

  /* ------------------------------------------------------------------
   2️⃣  REUSABLE UI HELPERS
   ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------
   2️⃣  REUSABLE UI HELPERS
   ------------------------------------------------------------------ */

  const TabBar = ({ tabs, active, onSelect }) => (
    <div
      style={{
        display: "flex",
        gap: "2px",
        borderBottom: "2px solid #e5e5e5",
        margin: "0 0 20px",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={(e) => {
            e.stopPropagation() //
            onSelect(tab.key)
          }}
          style={{
            padding: "8px 20px",
            background: "transparent",
            border: "none",
            fontWeight: active === tab.key ? 600 : 400,
            borderBottom: active === tab.key ? "3px solid #007bff" : "3px solid transparent",
            cursor: "pointer",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  if (currentView === "login") {
    return (
      <div style={{ padding: "50px", maxWidth: "400px", margin: "auto" }}>
        <h2>Login</h2>
        <input
          placeholder="Username"
          value={loginForm.username}
          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
          style={{ width: "100%", padding: "10px", margin: "10px 0" }}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={loginForm.password}
          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
          style={{ width: "100%", padding: "10px", margin: "10px 0" }}
        />
        <br />
        <StyledButton onClick={handleLogin}>Login</StyledButton>
      </div>
    )
  }
  // Make sure the HospitalDevicePage component is properly passed the updateDeviceInFirebase function
  // Find the section where hospitalDevicePageDevice is rendered and update it:

  if (hospitalDevicePageDevice && loggedInUser?.role === "hospital") {
    return (
      <HospitalDevicePage
        device={hospitalDevicePageDevice}
        onBack={() => setHospitalDevicePageDevice(null)}
        updateDeviceInFirebase={updateDeviceInFirebase}
        showToast={showToast}
      />
    )
  }
  return (
    <div
      style={{
        fontFamily: FONTS.primary,
        color: COLORS.text,
        backgroundColor: COLORS.background,
        padding: "20px",
        minHeight: "100vh",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>MediTrack</h1>
          <p>
            Logged in as: <strong>{loggedInUser?.name}</strong> ({loggedInUser?.role})
          </p>
          {toastMessage && (
            <div
              style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                backgroundColor: toastType === "success" ? "#28a745" : toastType === "error" ? "#dc3545" : "#007bff",
                color: "white",
                padding: "12px 24px",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                zIndex: 1000,
              }}
            >
              {toastMessage}
            </div>
          )}
        </div>
        <StyledButton
          onClick={() => {
            setCurrentView("login")
            setLoggedInUser(null)
            setLoginForm({ username: "", password: "" })
          }}
        >
          Sign Out
        </StyledButton>
      </div>
      {loggedInUser?.role === "hospital" && (
        <TabBar
          tabs={[
            { key: "all_devices", label: "All Devices" },
            { key: "categories", label: "Categories" },
            { key: "maintenance_view", label: "Maintenance" },
            { key: "add_device", label: "Add Device" },
            { key: "request_maintenance", label: "Request Maintenance" },
            { key: "my_requests", label: "My Requests" },
          ]}
          active={activeTab}
          onSelect={(key) => {
            if (key !== activeTab) {
              setActiveTab(key)
            }
          }}
        />
      )}

      {/* ---- Supplier / Technician navigation ---- */}
      {loggedInUser && loggedInUser.role !== "hospital" && (
        <TabBar
          tabs={
            loggedInUser.role === "supplier"
              ? [
                  { key: "supplier_management", label: "Device Management" },
                  { key: "supplier_catalog", label: "Supplier Catalog" },
                  { key: "add_device", label: "Add Device" },
                  { key: "requests", label: "Requests" },
                ]
              : [
                  // technician
                  { key: "maintenance", label: "Maintenance" },
                ]
          }
          active={activeTab}
          onSelect={(key) => {
            if (key !== activeTab) {
              setActiveTab(key)
            }
          }}
        />
      )}

      {activeTab === "categories" && loggedInUser?.role === "hospital" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "20px",
            padding: "20px",
          }}
        >
          {Object.entries(deviceCategories).map(([key, value]) => (
            <StyledBox
              key={key}
              style={{
                textAlign: "center",
                padding: "30px",
                cursor: "pointer",
                transition: "transform 0.3s",
                transform: "scale(1)",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onClick={() => {
                setSelectedCategory(key)
                setActiveTab(`category_devices_${key}`)
              }}
            >
              <h2>{value}</h2>
              <p>{devices.filter((d) => d.category === key).length} devices</p>
            </StyledBox>
          ))}
        </div>
      )}
      {activeTab === "my_requests" && loggedInUser?.role === "hospital" && (
        <div style={{ marginTop: "20px" }}>
          <h2>My Device Requests</h2>

          {deviceRequests.filter((req) => req.hospital === loggedInUser.name).length === 0 ? (
            <p>You have no requests.</p>
          ) : (
            deviceRequests
              .filter((req) => req.hospital === loggedInUser.name)
              .map((req, index) => (
                <StyledBox key={index} urgency={req.urgency}>
                  <strong>Device:</strong> {req.device.name} ({req.device.model})<br />
                  <strong>Serial:</strong> {req.device.serialNumber}
                  <br />
                  <strong>Supplier:</strong> {req.supplier}
                  <br />
                  <strong>Status:</strong> {req.status}
                  <br />
                </StyledBox>
              ))
          )}
        </div>
      )}
      {activeTab === "request_maintenance" && loggedInUser?.role === "hospital" && (
        <div style={{ marginTop: "20px" }}>
          <h2>Request Maintenance</h2>

          {devices.filter((device) => device.assignedTo === loggedInUser.name).length === 0 ? (
            <p>You don't have any devices to request maintenance for.</p>
          ) : (
            <>
              <h4>Select Device</h4>
              <select
                onChange={(e) => setSelectedDevice(devices.find((d) => d.id === e.target.value))}
                style={{ padding: "10px", width: "100%", marginBottom: "20px" }}
              >
                <option value="">Select a device</option>
                {devices
                  .filter((device) => device.assignedTo === loggedInUser.name)
                  .map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.model})
                    </option>
                  ))}
              </select>

              {selectedDevice && (
                <>
                  <h4>Urgency Level</h4>
                  <select
                    onChange={(e) => setNewRequestData((prev) => ({ ...prev, urgency: e.target.value }))}
                    style={{ padding: "10px", width: "100%", marginBottom: "20px" }}
                  >
                    <option value="">Select urgency</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <h4>Type of Request</h4>
                  <select
                    onChange={(e) => setNewRequestData((prev) => ({ ...prev, requestType: e.target.value }))}
                    style={{ padding: "10px", width: "100%", marginBottom: "10px" }}
                  >
                    <option value="">Select type</option>
                    <option value="Software issue">Software issue</option>
                    <option value="Hardware repair">Hardware repair</option>
                    <option value="Calibration needed">Calibration needed</option>
                    <option value="Other">Other</option>
                  </select>

                  {newRequestData.requestType === "Other" && (
                    <input
                      placeholder="Describe the request"
                      onChange={(e) => setNewRequestData((prev) => ({ ...prev, customRequestType: e.target.value }))}
                      style={{ padding: "10px", width: "100%", marginBottom: "20px" }}
                    />
                  )}
                  <h4>Issue Details (Optional)</h4>
                  <textarea
                    placeholder="Describe the issue in more detail..."
                    value={newRequestData.comment}
                    onChange={(e) => setNewRequestData({ ...newRequestData, comment: e.target.value })}
                    style={{ padding: "10px", width: "100%", minHeight: "80px", marginBottom: "20px" }}
                  />

                  <h4>Preferred Date</h4>
                  <input
                    type="date"
                    onChange={(e) => setNewRequestData((prev) => ({ ...prev, preferredDate: e.target.value }))}
                    style={{ padding: "10px", width: "100%", marginBottom: "20px" }}
                  />

                  <h4>Preferred Time Window</h4>
                  <select
                    value={newRequestData.preferredWindow}
                    onChange={(e) => setNewRequestData({ ...newRequestData, preferredWindow: e.target.value })}
                    style={{ padding: "10px", width: "100%", marginBottom: "20px" }}
                  >
                    <option value="">Select Time Window</option>
                    <option value="08:00–12:00">08:00–12:00</option>
                    <option value="12:00–16:00">12:00–16:00</option>
                    <option value="16:00–20:00">16:00–20:00</option>
                    <option value="20:00–00:00">20:00–00:00</option>
                  </select>

                  <label>Request To:</label>
                  <div style={{ marginBottom: "15px" }}>
                    {/* Supplier checkbox — only if matches selectedDevice.supplier */}
                    {accounts
                      .filter((acc) => acc.role === "supplier" && acc.name === selectedDevice?.supplier)
                      .map((acc) => (
                        <label key={acc.id} style={{ display: "block", marginBottom: "5px" }}>
                          <input
                            type="checkbox"
                            checked={newRequestData.recipients?.includes(acc.name)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...(newRequestData.recipients || []), acc.name]
                                : newRequestData.recipients.filter((r) => r !== acc.name)
                              setNewRequestData({ ...newRequestData, recipients: updated })
                            }}
                          />
                          Supplier - {acc.name}
                        </label>
                      ))}

                    {/* Technician checkboxes */}
                    {accounts
                      .filter((acc) => acc.role === "technician")
                      .map((acc) => (
                        <label key={acc.id} style={{ display: "block", marginBottom: "5px" }}>
                          <input
                            type="checkbox"
                            checked={newRequestData.recipients?.includes(acc.name)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...(newRequestData.recipients || []), acc.name]
                                : newRequestData.recipients.filter((r) => r !== acc.name)
                              setNewRequestData({ ...newRequestData, recipients: updated })
                            }}
                          />
                          Technician - {acc.name}
                        </label>
                      ))}
                  </div>

                  {formErrors.length > 0 && (
                    <div
                      style={{
                        backgroundColor: "#ffe6e6",
                        color: "#a94442",
                        border: "1px solid #f5c6cb",
                        padding: "10px",
                        borderRadius: "5px",
                        marginBottom: "15px",
                      }}
                    >
                      <strong>Please fix the following:</strong>
                      <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                        {formErrors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <StyledButton
                    onClick={async () => {
                      const errors = []

                      if (!newRequestData.urgency) errors.push("Urgency level is required")
                      if (!newRequestData.requestType) errors.push("Request type is required")
                      if (newRequestData.requestType === "Other" && !newRequestData.customRequestType)
                        errors.push("Custom request description is required")
                      if (!newRequestData.preferredDate) errors.push("Preferred date is required")
                      if (!newRequestData.preferredWindow) errors.push("Preferred time window is required")
                      if (!newRequestData.recipients || newRequestData.recipients.length === 0)
                        errors.push("At least one recipient must be selected")

                      if (errors.length > 0) {
                        setFormErrors(errors)
                        return
                      } else {
                        setFormErrors([]) // clear errors if passed
                      }

                      const finalType =
                        newRequestData.requestType === "Other"
                          ? newRequestData.customRequestType
                          : newRequestData.requestType

                      // Step 1: Build request object
                      const newRequest = {
                        hospital: loggedInUser.name,
                        device: {
                          id: selectedDevice.id,
                          name: selectedDevice.name,
                          model: selectedDevice.model,
                          serialNumber: selectedDevice.serialNumber,
                        },
                        supplier: selectedDevice?.supplier || "",
                        urgency: newRequestData.urgency,
                        requestType: finalType,
                        preferredDate: newRequestData.preferredDate,
                        preferredWindow: newRequestData.preferredWindow,
                        recipients: newRequestData.recipients,
                        comment: newRequestData.comment,
                        status: "Pending",
                        approvedDate: "",
                        approvedTime: "",
                      }

                      // Step 2: Save to Firestore
                      const docRef = await addDoc(collection(db, "Requests"), newRequest)

                      // Step 3: Attach Firestore-generated ID
                      newRequest.id = docRef.id

                      // Step 4: Update local state
                      setDeviceRequests((prev) => [...prev, newRequest])
                      await fetchRequests()
                      setSelectedDevice(null)
                      setNewRequestData({
                        type: "",
                        otherType: "",
                        preferredDate: "",
                        preferredWindow: "",
                        recipients: [],
                        status: "Pending",
                        approvedDate: "",
                        approvedTime: "",
                        comment: "",
                      })

                      showToast("Request submitted!", "success")
                    }}
                  >
                    Submit Request
                  </StyledButton>
                </>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === `category_devices_${selectedCategory}` && loggedInUser?.role === "hospital" && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <StyledButton onClick={() => setActiveTab("categories")}>← Back to Categories</StyledButton>
          </div>
          <h2>{deviceCategories[selectedCategory]}</h2>
          {devices.filter((device) => device.category === selectedCategory).length === 0 ? (
            <p>No devices found in this category.</p>
          ) : (
            devices
              .filter((device) => device.category === selectedCategory)
              .map((device) => (
                <StyledBox key={device.id}>
                  <strong>{device.name}</strong> ({device.model})<br />
                  Serial: {device.serialNumber}
                  <br />
                  Status: {device.status}
                  <br />
                  Last Maintenance: {device.lastMaintenance}
                  <br />
                  Next Maintenance: {device.nextMaintenance}
                  <br />
                  <StyledButton
                    onClick={() => {
                      loggedInUser?.role === "hospital" ? (
                        <StyledButton
                          onClick={() => {
                            setHospitalDevicePageDevice(device) // trigger full-page view
                          }}
                        >
                          View Details
                        </StyledButton>
                      ) : (
                        <StyledButton
                          onClick={() => {
                            setHospitalDevicePageDevice(device)
                          }}
                        >
                          View Details
                        </StyledButton>
                      )
                    }}
                  >
                    View Details
                  </StyledButton>
                </StyledBox>
              ))
          )}
        </div>
      )}

      {activeTab === "maintenance_view" && loggedInUser?.role === "hospital" && (
        <div style={{ marginTop: "20px" }}>
          <h2>Maintenance Overview</h2>

          <h3 style={{ color: "#dc3545" }}>Needs Maintenance ASAP</h3>
          {devices
            .filter((device) => {
              const nextDate = new Date(device.nextMaintenance)
              return nextDate < new Date()
            })
            .map((device) => (
              <StyledBox key={device.id} style={{ border: "2px solid #dc3545" }}>
                <strong>{device.name}</strong> ({device.model})<br />
                Due: {device.nextMaintenance}
                <br />
                Status: Overdue
              </StyledBox>
            ))}

          <h3 style={{ color: "#ffc107" }}>Due in 3 Days</h3>
          {devices
            .filter((device) => {
              const nextDate = new Date(device.nextMaintenance)
              const daysUntil = Math.floor((nextDate - new Date()) / (1000 * 60 * 60 * 24))
              return daysUntil <= 3 && daysUntil >= 0
            })
            .map((device) => (
              <StyledBox key={device.id} style={{ border: "2px solid #ffc107" }}>
                <strong>{device.name}</strong> ({device.model})<br />
                Due: {device.nextMaintenance}
              </StyledBox>
            ))}

          <h3 style={{ color: "#28a745" }}>Due in 7 Days</h3>
          {devices
            .filter((device) => {
              const nextDate = new Date(device.nextMaintenance)
              const daysUntil = Math.floor((nextDate - new Date()) / (1000 * 60 * 60 * 24))
              return daysUntil <= 7 && daysUntil > 3
            })
            .map((device) => (
              <StyledBox key={device.id} style={{ border: "2px solid #28a745" }}>
                <strong>{device.name}</strong> ({device.model})<br />
                Due: {device.nextMaintenance}
              </StyledBox>
            ))}
        </div>
      )}

      {activeTab === "all_devices" && loggedInUser?.role === "hospital" && (
        <div style={{ marginTop: "20px" }}>
          <h3>Device Inventory</h3>
          <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "8px", width: "200px" }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: "8px", width: "150px" }}
            >
              <option value="">All Categories</option>
              {Object.entries(deviceCategories).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
            <select onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px", width: "150px" }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
            <StyledButton
              onClick={() => {
                setNotifications(notifications.map((n) => ({ ...n, read: true })))
                setShowNotifications(!showNotifications)
              }}
            >
              Notifications ({notifications.filter((n) => !n.read).length})
            </StyledButton>
            {showNotifications && notifications.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  right: "0",
                  top: "40px",
                  background: "white",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  width: "300px",
                }}
              >
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #eee",
                      background: notification.read ? "white" : "#f0f0f0",
                    }}
                  >
                    {notification.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {devices
            .filter(
              (device) =>
                (device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  device.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (!selectedCategory || device.category === selectedCategory),
            )
            .map((device) => (
              <StyledBox key={device.id}>
                <strong>{device.name}</strong> ({device.model})<br />
                Serial: {device.serialNumber} <br />
                Status: <strong>{device.status}</strong> | Assigned to: {device.assignedTo || "Unassigned"}
                <br />
                Next Maintenance: {device.nextMaintenance}
                <br />
                Supplier: {device.supplier}
                <br />
                Category: {deviceCategories[device.category]}
                <br />
                <StyledButton
                  onClick={() => {
                    if (loggedInUser?.role === "hospital") {
                      setHospitalDevicePageDevice(device)
                    } else {
                      setHospitalDevicePageDevice(device)
                    }
                  }}
                >
                  View Details
                </StyledButton>
              </StyledBox>
            ))}
        </div>
      )}

      {activeTab === "requests" && (loggedInUser?.role === "supplier" || loggedInUser?.role === "technician") && (
        <div style={{ marginTop: "20px" }}>
          <h2>Requests</h2>

          <TabBar
            tabs={[
              { key: "pending", label: "Pending" },
              { key: "approved", label: "Approved" },
              { key: "history", label: "History" },
            ]}
            active={supplierTab}
            onSelect={setSupplierTab}
          />

          {/* Pending */}
          {supplierTab === "pending" && (
            <>
              {deviceRequests.filter(
                (req) =>
                  req.status === "Pending" &&
                  Array.isArray(req.recipients) &&
                  req.recipients.includes(loggedInUser.name),
              ).length === 0 ? (
                <p>No pending requests.</p>
              ) : (
                deviceRequests
                  .filter(
                    (req) =>
                      req.status === "Pending" &&
                      Array.isArray(req.recipients) &&
                      req.recipients.includes(loggedInUser.name),
                  )
                  .map((req, index) => (
                    <StyledBox key={index} urgency={req.urgency}>
                      <strong>Device:</strong> {req.device.name} ({req.device.model})<br />
                      <strong>Issue:</strong> {req.requestType}
                      <br />
                      <strong>Serial:</strong> {req.device.serialNumber}
                      <br />
                      <strong>Urgency:</strong> {req.urgency}
                      <br />
                      <strong>Type:</strong> {req.requestType}
                      <br />
                      <strong>Comment:</strong> {req.comment || "N/A"}
                      <br />
                      <strong>Preferred Date:</strong> {req.preferredDate}
                      <br />
                      <strong>Preferred Time Window:</strong> {req.preferredWindow}
                      <br />
                      <br />
                      <StyledButton onClick={() => handleRequestStatusChange(req.id, "Approved")}>Approve</StyledButton>
                    </StyledBox>
                  ))
              )}
            </>
          )}

          {/* Approved */}
          {supplierTab === "approved" && (
            <>
              {deviceRequests.filter(
                (req) =>
                  req.status === "Approved" &&
                  Array.isArray(req.recipients) &&
                  req.recipients.includes(loggedInUser.name),
              ).length === 0 ? (
                <p>No approved requests.</p>
              ) : (
                deviceRequests
                  .filter(
                    (req) =>
                      req.status === "Approved" &&
                      Array.isArray(req.recipients) &&
                      req.recipients.includes(loggedInUser.name),
                  )
                  .map((req, index) => (
                    <StyledBox key={index} urgency={req.urgency}>
                      <strong>Device:</strong> {req.device.name} ({req.device.model})<br />
                      <strong>Approved On:</strong> {req.approvedDate}
                      <br />
                      <strong>Comment:</strong> {req.comment || "N/A"}
                      <br />
                      <textarea
                        placeholder="Maintenance Notes"
                        onChange={(e) => setTechnicianNotes(e.target.value)}
                        style={{ padding: "8px", width: "100%", marginTop: "10px" }}
                      />
                      <StyledButton
                        onClick={() => {
                          const updated = [...deviceRequests]
                          updated[index] = {
                            ...req,
                            status: "Completed",
                            completedDate: new Date().toISOString().split("T")[0],
                            technician: loggedInUser.name,
                            notes: technicianNotes,
                          }
                          setDeviceRequests(updated)
                          updateRequestInFirebase(updated[index])
                        }}
                      >
                        Log Maintenance
                      </StyledButton>
                    </StyledBox>
                  ))
              )}
            </>
          )}

          {/* History */}
          {supplierTab === "history" && (
            <>
              {deviceRequests.filter((req) => req.status === "Completed" && req.recipients.includes(loggedInUser.name))
                .length === 0 ? (
                <p>No maintenance history.</p>
              ) : (
                deviceRequests
                  .filter((req) => req.status === "Completed" && req.recipients.includes(loggedInUser.name))
                  .map((req, index) => (
                    <StyledBox key={index} urgency={req.urgency}>
                      <strong>Device:</strong> {req.device.name} ({req.device.model})<br />
                      <strong>Completed:</strong> {req.completedDate}
                      <br />
                      <strong>Technician:</strong> {req.technician}
                      <br />
                      <strong>Notes:</strong> {req.notes}
                      <br />
                    </StyledBox>
                  ))
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "supplier_management" && loggedInUser?.role === "supplier" && (
        <div style={{ marginTop: "20px" }}>
          <h3>Device Management</h3>

          {/* Generate Hospital Buttons */}
          <h4>Hospitals</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            {[
              ...new Set(
                devices
                  .filter((device) => device.supplier === loggedInUser.name)
                  .map((device) => device.assignedTo || "Unassigned"),
              ),
            ].map((hospital) => (
              <StyledButton
                key={hospital}
                onClick={() => setSelectedHospitalView(hospital)}
                style={{
                  background: selectedHospitalView === hospital ? "#28a745" : "#007bff",
                  color: "white",
                }}
              >
                {hospital}
              </StyledButton>
            ))}
          </div>

          {/* Show devices for selected hospital */}
          {selectedHospitalView && (
            <div>
              <h4>Devices in {selectedHospitalView}</h4>
              {devices.filter(
                (device) =>
                  device.supplier === loggedInUser.name && (device.assignedTo || "Unassigned") === selectedHospitalView,
              ).length === 0 ? (
                <p>No devices assigned to this hospital yet.</p>
              ) : (
                devices
                  .filter(
                    (device) =>
                      device.supplier === loggedInUser.name &&
                      (device.assignedTo || "Unassigned") === selectedHospitalView,
                  )
                  .map((device) => (
                    <StyledBox key={device.id}>
                      <strong>{device.name}</strong> ({device.model})<br />
                      Serial: {device.serialNumber}
                      <br />
                      Status: {device.status}
                      <br />
                      Last Maintenance: {device.lastMaintenance}
                      <br />
                      Next Maintenance: {device.nextMaintenance}
                      <br />
                      Assigned To: {device.assignedTo || "Unassigned"}
                    </StyledBox>
                  ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "supplier_catalog" && loggedInUser?.role === "supplier" && (
        <div style={{ marginTop: "20px" }}>
          <h3>Supplier Catalog</h3>

          {devices
            .filter((d) => d.supplier === loggedInUser.name)
            .map((device) => (
              <StyledBox key={device.id}>
                <strong>{device.name}</strong> ({device.model})<br />
                Maintenance Frequency: {device.maintenanceFrequency}
                <br />
                <StyledButton
                  onClick={() => {
                    setSelectedCatalogDevice(device)
                    setAssignHospital("")
                    setAssignHospitalOther("")
                    setAssignFrequency(device.maintenanceFrequency)
                  }}
                >
                  Assign to Hospital
                </StyledButton>
              </StyledBox>
            ))}
        </div>
      )}

      {activeTab === "maintenance" && loggedInUser?.role === "technician" && (
        <div style={{ marginTop: "20px" }}>
          <h2>Technician Requests</h2>

          <TabBar
            tabs={[
              { key: "pending", label: "Pending" },
              { key: "approved", label: "Approved" },
              { key: "history", label: "History" },
            ]}
            active={technicianTab}
            onSelect={setTechnicianTab}
          />

          {/* Pending Requests */}
          {technicianTab === "pending" && (
            <>
              {deviceRequests.filter(
                (req) =>
                  req.status === "Pending" &&
                  Array.isArray(req.recipients) &&
                  req.recipients.includes(loggedInUser.name),
              ).length === 0 ? (
                <p>No pending requests.</p>
              ) : (
                deviceRequests
                  .filter(
                    (req) =>
                      Array.isArray(req.recipients) &&
                      req.recipients.includes(loggedInUser.name) &&
                      req.status === "Pending",
                  )
                  .map((req, index) => (
                    <StyledBox key={index} urgency={req.urgency}>
                      <strong>Device:</strong> {req.device.name} ({req.device.model})<br />
                      <strong>Issue:</strong> {req.requestType}
                      <br />
                      <strong>Serial:</strong> {req.device.serialNumber}
                      <br />
                      <strong>Urgency:</strong> {req.urgency}
                      <br />
                      <strong>Type:</strong> {req.requestType}
                      <br />
                      <strong>Comment:</strong> {req.comment || "N/A"}
                      <br />
                      <strong>Preferred Date:</strong> {req.preferredDate}
                      <br />
                      <strong>Preferred Time Window:</strong> {req.preferredWindow}
                      <br />
                      <br />
                      <StyledButton onClick={() => handleRequestStatusChange(req.id, "Approved")}>Approve</StyledButton>
                    </StyledBox>
                  ))
              )}
            </>
          )}

          {/* Approved Requests */}
          {technicianTab === "approved" && (
            <>
              {deviceRequests.filter(
                (req) =>
                  req.status === "Approved" &&
                  Array.isArray(req.recipients) &&
                  req.recipients.includes(loggedInUser.name),
              ).length === 0 ? (
                <p>No approved requests.</p>
              ) : (
                deviceRequests
                  .filter(
                    (req) =>
                      req.status === "Approved" &&
                      Array.isArray(req.recipients) &&
                      req.recipients.includes(loggedInUser.name),
                  )
                  .map((req, index) => (
                    <StyledBox key={index} urgency={req.urgency}>
                      <strong>Device:</strong> {req.device.name} ({req.device.model})<br />
                      <strong>Issue:</strong> {req.requestType}
                      <br />
                      <strong>Comment:</strong> {req.comment || "N/A"}
                      <br />
                      <strong>Serial:</strong> {req.device.serialNumber}
                      <br />
                      <strong>Approved On:</strong> {req.approvedDate}
                      <br />
                      <textarea
                        placeholder="Maintenance Notes"
                        onChange={(e) => setTechnicianNotes(e.target.value)}
                        style={{ padding: "8px", width: "100%", marginTop: "10px" }}
                      />
                      <StyledButton
                        onClick={() => {
                          const updated = [...deviceRequests]
                          updated[index] = {
                            ...req,
                            status: "Completed",
                            completedDate: new Date().toISOString().split("T")[0],
                            technician: loggedInUser.name,
                            notes: technicianNotes,
                          }
                          setDeviceRequests(updated)
                          updateRequestInFirebase(updated[index])

                          // ✅ Update device history
                          const updatedDevices = devices.map((device) => {
                            if (device.id === req.device.id) {
                              const updatedHistory = [
                                ...(device.history || []),
                                {
                                  date: new Date().toISOString().split("T")[0],
                                  technician: loggedInUser.name,
                                  type: req.requestType,
                                  notes: technicianNotes,
                                },
                              ]

                              const updatedDevice = {
                                ...device,
                                history: updatedHistory,
                              }

                              updateDeviceInFirebase(updatedDevice)
                              return updatedDevice
                            }
                            return device
                          })

                          setDevices(updatedDevices)
                        }}
                      >
                        Log Maintenance
                      </StyledButton>
                    </StyledBox>
                  ))
              )}
            </>
          )}

          {/* History */}
          {technicianTab === "history" && (
            <>
              {deviceRequests.filter((req) => req.status === "Completed" && req.technician === loggedInUser.name)
                .length === 0 ? (
                <p>No maintenance history.</p>
              ) : (
                deviceRequests
                  .filter((req) => req.status === "Completed" && req.technician.includes(loggedInUser.name))
                  .map((req, index) => (
                    <StyledBox key={index} urgency={req.urgency}>
                      <strong>Device:</strong> {req.device.name} ({req.device.model})<br />
                      <strong>Issue:</strong> {req.requestType}
                      <br />
                      <strong>Comment:</strong> {req.comment || "N/A"}
                      <br />
                      <strong>Serial:</strong> {req.device.serialNumber}
                      <br />
                      <strong>Completed:</strong> {req.completedDate}
                      <br />
                      <strong>Technician:</strong> {req.technician}
                      <br />
                      <strong>Notes:</strong> {req.notes}
                      <br />
                    </StyledBox>
                  ))
              )}
            </>
          )}
        </div>
      )}

      {showMaintenanceForm && (
        <StyledBox style={{ maxWidth: "500px", margin: "20px auto" }}>
          <h3>Log Maintenance</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label>Device: </label>
              <strong>{newMaintenance.deviceName}</strong>
            </div>
            <div>
              <label>Date: </label>
              <input
                type="date"
                value={newMaintenance.date}
                onChange={(e) => setNewMaintenance({ ...newMaintenance, date: e.target.value })}
                style={{ padding: "8px", width: "100%" }}
              />
            </div>
            <div>
              <label>Maintenance Notes: </label>
              <textarea
                placeholder="Describe the maintenance performed..."
                value={newMaintenance.notes}
                onChange={(e) => setNewMaintenance({ ...newMaintenance, notes: e.target.value })}
                style={{ padding: "8px", width: "100%", minHeight: "100px" }}
              />
            </div>
            <div>
              <label>Status: </label>
              <select
                value={newMaintenance.status}
                onChange={(e) => setNewMaintenance({ ...newMaintenance, status: e.target.value })}
                style={{ padding: "8px", width: "100%" }}
              >
                <option value="completed">Completed</option>
                <option value="needs_followup">Needs Follow-Up</option>
              </select>
            </div>
            <StyledButton onClick={handleAddMaintenance}>Save Maintenance</StyledButton>
            <StyledButton onClick={() => setShowMaintenanceForm(false)}>Cancel</StyledButton>
          </div>
        </StyledBox>
      )}
      {activeTab === "add_device" && (
        <StyledBox style={{ maxWidth: "600px", margin: "20px auto" }}>
          <h2>Add New Device</h2>

          <h4>Device Information</h4>
          <input
            placeholder="Device Name *"
            value={newDevice.name}
            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
            style={{ padding: "10px", width: "100%", marginBottom: "10px" }}
          />

          <input
            placeholder="Model *"
            value={newDevice.model}
            onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
            style={{ padding: "10px", width: "100%", marginBottom: "10px" }}
          />

          <input
            placeholder="Serial Number *"
            value={newDevice.serialNumber}
            onChange={(e) => setNewDevice({ ...newDevice, serialNumber: e.target.value })}
            style={{ padding: "10px", width: "100%", marginBottom: "20px" }}
          />

          {loggedInUser.role === "supplier" ? (
            <select
              value={newDevice.category}
              onChange={(e) => setNewDevice({ ...newDevice, category: e.target.value })}
              style={{ padding: "10px", width: "100%", marginBottom: "20px" }}
            >
              <option value="">Select Category *</option>
              {Object.entries(deviceCategories).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={loggedInUser.name}
              disabled
              readOnly
              style={{ padding: "10px", width: "100%", background: "#eee", marginBottom: "20px" }}
            />
          )}

          <h4>Supplier</h4>
          {loggedInUser.role === "supplier" ? (
            <input
              value={loggedInUser.name}
              disabled
              readOnly
              style={{ padding: "10px", width: "100%", background: "#eee", marginBottom: "20px" }}
            />
          ) : (
            <>
              <select
                value={newDevice.supplier}
                onChange={(e) => setNewDevice({ ...newDevice, supplier: e.target.value })}
                style={{ padding: "10px", width: "100%", marginBottom: "10px" }}
              >
                {accounts
                  .filter((acc) => acc.role === "supplier")
                  .map((supp) => (
                    <option key={supp.id} value={supp.name}>
                      {supp.name}
                    </option>
                  ))}
                <option value="Other">Other</option>
              </select>

              {newDevice.supplier === "Other" && (
                <input
                  placeholder="Enter Supplier Name *"
                  value={newDevice.customSupplier}
                  onChange={(e) => setNewDevice({ ...newDevice, customSupplier: e.target.value })}
                  style={{ padding: "10px", width: "100%", marginBottom: "20px" }}
                />
              )}
            </>
          )}

          <StyledButton
            onClick={async () => {
              console.log("[DEBUG] Save button clicked")

              try {
                // Validate required fields
                if (!newDevice.name?.trim() || !newDevice.model?.trim() || !newDevice.serialNumber?.trim()) {
                  showToast("Missing required fields: Name, Model, Serial Number", "error")
                  return
                }

                // Hospital-specific validation
                if (loggedInUser.role === "hospital") {
                  const supplier =
                    newDevice.supplier === "Other" ? newDevice.customSupplier?.trim() : newDevice.supplier

                  if (!supplier) {
                    showToast("Please select or enter a valid supplier", "error")
                    return
                  }
                }

                // Build device object
                // Build device object
                const deviceData = {
                  name: newDevice.name.trim(),
                  model: newDevice.model.trim(),
                  serialNumber: newDevice.serialNumber.trim(),
                  status: "active",
                  lastMaintenance: newDevice.lastMaintenance,
                  nextMaintenance: newDevice.nextMaintenance,
                  category: newDevice.category || "general",
                  supplier:
                    loggedInUser.role === "supplier"
                      ? loggedInUser.name
                      : newDevice.supplier === "Other"
                        ? newDevice.customSupplier.trim()
                        : newDevice.supplier,
                  assignedTo: loggedInUser.role === "hospital" ? loggedInUser.name : "",
                  createdAt: new Date().toISOString(), // Fixed method name
                }

                console.log("[DEBUG] Attempting to save:", deviceData)

                // Save to Firebase
                const savedDevice = await saveDeviceToFirebase(deviceData)
                console.log("[DEBUG] Saved device:", savedDevice)

                // Update local state
                setDevices((prev) => [...prev, savedDevice])

                // Reset form
                setNewDevice({
                  name: "",
                  model: "",
                  serialNumber: "",
                  status: "active",
                  lastMaintenance: new Date().toISOString().split("T")[0],
                  nextMaintenance: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0],
                  assignedTo: "",
                  supplier: "",
                  customSupplier: "",
                  category: "",
                })

                showToast("Device saved successfully!", "success")
              } catch (error) {
                console.error("[ERROR] Save failed:", error)
                showToast("Save failed: ${error.message}", "error")
              }
            }}
            disabled={
              !newDevice.name?.trim() ||
              !newDevice.model?.trim() ||
              !newDevice.serialNumber?.trim() ||
              (loggedInUser.role === "hospital" &&
                (!newDevice.supplier || (newDevice.supplier === "Other" && !newDevice.customSupplier?.trim())))
            }
            style={{
              padding: "12px 24px",
              width: "100%",
              marginTop: "20px",
              fontSize: "16px",
            }}
          >
            Save Device
          </StyledButton>
        </StyledBox>
      )}

      {selectedCatalogDevice && (
        <div
          onClick={() => setSelectedCatalogDevice(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              width: "400px",
              maxWidth: "90%",
              position: "relative",
            }}
          >
            {/* X Close Button */}
            <button
              onClick={() => setSelectedCatalogDevice(null)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              &times;
            </button>

            <h2 style={{ marginBottom: "20px" }}>Assign {selectedCatalogDevice.name}</h2>

            <div style={{ marginBottom: "15px" }}>
              <label>Hospital:</label>
              <select
                value={assignHospital}
                onChange={(e) => setAssignHospital(e.target.value)}
                style={{ padding: "10px", width: "100%", marginTop: "5px" }}
              >
                <option value="">Select Hospital</option>
                {hospitalAccounts.map((acc) => (
                  <option key={acc.id} value={acc.name}>
                    {acc.name}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>

              {assignHospital === "Other" && (
                <input
                  placeholder="Enter Hospital Name"
                  value={assignHospitalOther}
                  onChange={(e) => setAssignHospitalOther(e.target.value)}
                  style={{ padding: "10px", width: "100%", marginTop: "10px" }}
                />
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label>Maintenance Frequency:</label>
              <select
                value={assignFrequency}
                onChange={(e) => setAssignFrequency(Number(e.target.value))}
                style={{ padding: "10px", width: "100%", marginTop: "5px" }}
              >
                <option value="">Select Frequency</option>
                <option value="14">2 weeks</option>
                <option value="30">1 month</option>
                <option value="60">2 months</option>
                <option value="90">3 months</option>
              </select>
            </div>

            <StyledButton
              onClick={async () => {
                if (!assignHospital) {
                  showToast("Please select a hospital.", "error")
                  return
                }

                const hospitalName = assignHospital === "Other" ? assignHospitalOther : assignHospital
                const today = new Date()
                const nextMaintenance = new Date(today)
                const daysToAdd = Number.parseInt(assignFrequency || "0")

                if (isNaN(daysToAdd) || daysToAdd === 0) {
                  showToast("Please select maintenance frequency.", "error")
                  return
                }

                nextMaintenance.setDate(nextMaintenance.getDate() + daysToAdd)

                const updatedDevice = {
                  ...selectedCatalogDevice,
                  assignedTo: hospitalName,
                  lastMaintenance: today.toISOString().split("T")[0],
                  nextMaintenance: nextMaintenance.toISOString().split("T")[0],
                  maintenanceFrequency: daysToAdd,
                }

                await updateDeviceInFirebase(updatedDevice)

                setDevices((prev) => prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d)))

                showToast("Device assigned successfully!", "success")
                setSelectedCatalogDevice(null)
                setAssignHospital("")
                setAssignHospitalOther("")
                setAssignFrequency("")
              }}
            >
              Confirm Assignment
            </StyledButton>
          </div>
        </div>
      )}

      {showDeviceDetails && selectedDevice && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            width: "80%",
            maxHeight: "80vh",
            overflow: "auto",
          }}
        >
          <h2>{selectedDevice.name}</h2>
          <p>
            <strong>Model:</strong> {selectedDevice.model}
          </p>
          <p>
            <strong>Serial Number:</strong> {selectedDevice.serialNumber}
          </p>
          <p>
            <strong>Category:</strong> {deviceCategories[selectedDevice.category] || selectedDevice.category}
          </p>
          <p>
            <strong>Status:</strong> {selectedDevice.status}
          </p>
          <p>
            <strong>Last Maintenance:</strong> {selectedDevice.lastMaintenance}
          </p>
          <p>
            <strong>Next Maintenance:</strong> {selectedDevice.nextMaintenance}
          </p>
          <p>
            <strong>Assigned To:</strong> {selectedDevice.assignedTo || "Unassigned"}
          </p>
          <p>
            <strong>Supplier:</strong> {selectedDevice.supplier}
          </p>

          <h3>Device History</h3>
          {selectedDevice.history?.length > 0 ? (
            selectedDevice.history.map((event, index) => (
              <StyledBox key={index} urgency={req.urgency}>
                <strong>{event.date}</strong> - {event.type}
                <br />
                Technician: {event.technician}
                <br />
                Notes: {event.notes}
              </StyledBox>
            ))
          ) : (
            <p>No history available.</p>
          )}

          <h3>Comments</h3>
          {selectedDevice.comments?.length > 0 ? (
            selectedDevice.comments.map((comment, index) => (
              <StyledBox key={index} urgency={req.urgency}>
                <strong>{comment.user}</strong> - {comment.date}
                <br />
                {comment.text}
              </StyledBox>
            ))
          ) : (
            <p>No comments yet.</p>
          )}

          <div style={{ marginTop: "20px" }}>
            <input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <StyledButton
              onClick={() => {
                if (newComment.trim()) {
                  const updatedDevices = devices.map((d) => {
                    if (d.id === selectedDevice.id) {
                      const updatedDevice = {
                        ...d,
                        comments: [
                          ...(d.comments || []),
                          {
                            date: new Date().toISOString().split("T")[0],
                            user: loggedInUser.username,
                            text: newComment.trim(),
                          },
                        ],
                      }
                      updateDeviceInFirebase(updatedDevice)
                      return updatedDevice
                    }
                    return d
                  })

                  setDevices(updatedDevices)
                  setNewComment("")
                }
              }}
            >
              Add Comment
            </StyledButton>

            <StyledButton onClick={() => setShowDeviceDetails(false)}>Close</StyledButton>
          </div>
        </div>
      )}
    </div>
  )
}
