"use client"

import { useState, useEffect, useRef } from "react"
import StyledBox from "./StyledBox"
import StyledButton from "./StyledButton"
import { db } from "../firebaseConfig"
import { doc, setDoc } from "firebase/firestore"

// Define all possible maintenance frequencies for flexible rendering
const MAINTENANCE_FREQUENCIES = [
  { key: "per use", label: "Per Use" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
  { key: "as needed", label: "As Needed" },
  { key: "other", label: "Other" },
]

const MaintenanceChecklist = ({ device, maintenancePlan, maintenanceHistory, setMaintenanceHistory, showToast }) => {
  const [activeFrequency, setActiveFrequency] = useState("daily")
  const [activeView, setActiveView] = useState("current") // current or history
  const [checkedTasks, setCheckedTasks] = useState({})
  const [taskNotes, setTaskNotes] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showLiveTimer, setShowLiveTimer] = useState(true)
  const timerRef = useRef(null)

  // Update current time every second for the live timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Get the current period based on frequency
  const getCurrentPeriod = (frequency) => {
    const now = new Date()
    const frequencyLower = frequency.toLowerCase()

    switch (frequencyLower) {
      case "per use":
        return `${now.toISOString().split("T")[0]}_use_${now.getHours()}_${now.getMinutes()}` // Unique per use
      case "daily":
        return now.toISOString().split("T")[0] // YYYY-MM-DD
      case "weekly":
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
        return `${startOfWeek.toISOString().split("T")[0]}_week`
      case "monthly":
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}_month`
      case "quarterly":
        const quarter = Math.floor(now.getMonth() / 3) + 1
        return `${now.getFullYear()}_Q${quarter}`
      case "yearly":
        return `${now.getFullYear()}_year`
      case "as needed":
        return `${now.toISOString().split("T")[0]}_asneeded_${now.getHours()}_${now.getMinutes()}` // Unique for as needed
      default:
        return "other"
    }
  }

  // Get the next period based on frequency
  const getNextPeriod = (frequency) => {
    const now = new Date()
    const nextPeriodStart = new Date()
    const frequencyLower = frequency.toLowerCase()

    switch (frequencyLower) {
      case "per use":
        // Next use is immediate
        return now
      case "daily":
        // Next day
        nextPeriodStart.setDate(now.getDate() + 1)
        nextPeriodStart.setHours(0, 0, 0, 0)
        return nextPeriodStart
      case "weekly":
        // Next week (next Sunday)
        nextPeriodStart.setDate(now.getDate() + (7 - now.getDay()))
        nextPeriodStart.setHours(0, 0, 0, 0)
        return nextPeriodStart
      case "monthly":
        // First day of next month
        nextPeriodStart.setMonth(now.getMonth() + 1, 1)
        nextPeriodStart.setHours(0, 0, 0, 0)
        return nextPeriodStart
      case "quarterly":
        // First day of next quarter
        const currentQuarter = Math.floor(now.getMonth() / 3)
        nextPeriodStart.setMonth((currentQuarter + 1) * 3, 1)
        nextPeriodStart.setHours(0, 0, 0, 0)
        return nextPeriodStart
      case "yearly":
        // First day of next year
        nextPeriodStart.setFullYear(now.getFullYear() + 1, 0, 1)
        nextPeriodStart.setHours(0, 0, 0, 0)
        return nextPeriodStart
      case "as needed":
        // As needed tasks don't have a next period
        return null
      default:
        // Default to next week
        nextPeriodStart.setDate(now.getDate() + 7)
        nextPeriodStart.setHours(0, 0, 0, 0)
        return nextPeriodStart
    }
  }

  // Get deadline for the current frequency
  const getDeadline = (frequency) => {
    const now = new Date()
    let deadline = new Date()
    const frequencyLower = frequency.toLowerCase()

    switch (frequencyLower) {
      case "per use":
        // Per use tasks should be done immediately
        deadline.setHours(23, 59, 59, 999) // End of current day
        break
      case "daily":
        // Set to end of current day (23:59:59)
        deadline.setHours(23, 59, 59, 999)
        break
      case "weekly":
        // Set to end of current week (Saturday 23:59:59)
        const daysUntilEndOfWeek = 6 - now.getDay() // Days until Saturday
        deadline.setDate(now.getDate() + daysUntilEndOfWeek)
        deadline.setHours(23, 59, 59, 999)
        break
      case "monthly":
        // Set to end of current month
        deadline = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      case "quarterly":
        // Set to end of current quarter
        const currentQuarter = Math.floor(now.getMonth() / 3)
        deadline = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999)
        break
      case "yearly":
        // Set to end of current year
        deadline = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      case "as needed":
        // As needed tasks don't have a deadline
        deadline = null
        break
      default:
        // Default to 7 days from now
        deadline.setDate(now.getDate() + 7)
        deadline.setHours(23, 59, 59, 999)
    }

    return deadline
  }

  // Check if the current period is overdue
  const isOverdue = (frequency) => {
    const now = new Date()
    const currentPeriod = getCurrentPeriod(frequency)
    const frequencyLower = frequency.toLowerCase()

    // "As Needed" and "Per Use" tasks are never overdue
    if (frequencyLower === "as needed" || frequencyLower === "other" || frequencyLower === "per use") {
      return false
    }

    // If there's a completed checklist for this period, it's not overdue
    const isCompleted = maintenanceHistory?.some(
      (history) => history.frequency.toLowerCase() === frequencyLower && history.period === currentPeriod,
    )

    if (isCompleted) return false

    // If the maintenance plan doesn't exist or doesn't have a creation date, it can't be overdue
    if (!device.maintenancePlan || !device.maintenancePlan.createdAt) return false

    const planCreationDate = new Date(device.maintenancePlan.createdAt)

    // Handle different frequencies
    switch (frequencyLower) {
      case "daily":
        // For daily tasks, check if we're in a new day since plan creation
        const dayAfterCreation = new Date(planCreationDate)
        dayAfterCreation.setDate(dayAfterCreation.getDate() + 1)
        dayAfterCreation.setHours(0, 0, 0, 0) // Start of day
        return now > dayAfterCreation

      case "weekly":
        // For weekly tasks, check if we're in a new week since plan creation
        const weekAfterCreation = new Date(planCreationDate)
        weekAfterCreation.setDate(weekAfterCreation.getDate() + 7)
        weekAfterCreation.setHours(0, 0, 0, 0) // Start of day
        return now > weekAfterCreation

      case "monthly":
        // For monthly tasks, check if we're in a new month since plan creation
        const monthAfterCreation = new Date(planCreationDate)
        monthAfterCreation.setMonth(monthAfterCreation.getMonth() + 1)
        monthAfterCreation.setHours(0, 0, 0, 0) // Start of day
        return now > monthAfterCreation

      case "quarterly":
        // For quarterly tasks, check if we're in a new quarter since plan creation
        const quarterAfterCreation = new Date(planCreationDate)
        quarterAfterCreation.setMonth(quarterAfterCreation.getMonth() + 3)
        quarterAfterCreation.setHours(0, 0, 0, 0) // Start of day
        return now > quarterAfterCreation

      case "yearly":
        // For yearly tasks, check if we're in a new year since plan creation
        const yearAfterCreation = new Date(planCreationDate)
        yearAfterCreation.setFullYear(yearAfterCreation.getFullYear() + 1)
        yearAfterCreation.setHours(0, 0, 0, 0) // Start of day
        return now > yearAfterCreation

      default:
        // For other frequencies, don't mark as overdue
        return false
    }
  }

  // Format time remaining until deadline
  const formatTimeRemaining = (deadline) => {
    if (!deadline) return "No deadline"

    const now = new Date()
    const timeRemaining = deadline.getTime() - now.getTime()

    if (timeRemaining < 0) {
      return "OVERDUE"
    }

    const seconds = Math.floor((timeRemaining / 1000) % 60)
    const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60)
    const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24)
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))

    if (days > 0) {
      return `${days}d ${hours}h remaining`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    } else {
      return `${minutes}m ${seconds}s remaining`
    }
  }

  // Initialize checked tasks and notes when frequency changes
  useEffect(() => {
    if (!maintenancePlan) return

    const currentPeriod = getCurrentPeriod(activeFrequency)

    // Find if there's a completed checklist for this period
    const completedChecklist = maintenanceHistory?.find(
      (history) =>
        history.frequency.toLowerCase() === activeFrequency.toLowerCase() && history.period === currentPeriod,
    )

    if (completedChecklist) {
      // If there's a completed checklist, initialize with its data
      const initialCheckedTasks = {}
      const initialTaskNotes = {}

      completedChecklist.tasks.forEach((task) => {
        initialCheckedTasks[task.id] = task.completed
        initialTaskNotes[task.id] = task.notes
      })

      setCheckedTasks(initialCheckedTasks)
      setTaskNotes(initialTaskNotes)
    } else {
      // Otherwise, reset
      setCheckedTasks({})
      setTaskNotes({})
    }
  }, [activeFrequency, maintenancePlan, maintenanceHistory])

  // Get tasks for the current frequency
  const getTasksForFrequency = () => {
    if (!maintenancePlan || !maintenancePlan.schedule) return []

    // For the "other" category, make sure we include all tasks with "as needed" in their description
    if (activeFrequency.toLowerCase() === "other") {
      // Get all potential "other" tasks
      const otherTasks = maintenancePlan.schedule
        .filter(
          (item) =>
            item.frequency.toLowerCase() === "other" ||
            item.tasks.toLowerCase().includes("as needed") ||
            item.tasks.toLowerCase().includes("when needed") ||
            item.tasks.toLowerCase().includes("if needed"),
        )
        .map((item, index) => ({
          id: `${activeFrequency}_${index}`,
          description: item.tasks,
          pageReference: item.pageReference,
          isAsNeededTask:
            item.tasks.toLowerCase().includes("as needed") ||
            item.tasks.toLowerCase().includes("when needed") ||
            item.tasks.toLowerCase().includes("if needed"),
        }))

      // Deduplicate tasks based on description
      const uniqueTasks = []
      const seenDescriptions = new Set()

      otherTasks.forEach((task) => {
        if (!seenDescriptions.has(task.description)) {
          seenDescriptions.add(task.description)
          uniqueTasks.push(task)
        }
      })

      return uniqueTasks
    }

    // For "as needed" tasks
    if (activeFrequency.toLowerCase() === "as needed") {
      return maintenancePlan.schedule
        .filter((item) => item.frequency.toLowerCase() === "as needed")
        .map((item, index) => ({
          id: `${activeFrequency}_${index}`,
          description: item.tasks,
          pageReference: item.pageReference,
          isAsNeededTask: true,
        }))
    }

    // For "per use" tasks
    if (activeFrequency.toLowerCase() === "per use") {
      return maintenancePlan.schedule
        .filter((item) => item.frequency.toLowerCase() === "per use")
        .map((item, index) => ({
          id: `${activeFrequency}_${index}`,
          description: item.tasks,
          pageReference: item.pageReference,
        }))
    }

    // For other frequencies, exclude any "as needed" tasks that might have been missed
    return maintenancePlan.schedule
      .filter(
        (item) =>
          item.frequency.toLowerCase() === activeFrequency.toLowerCase() &&
          !(
            item.tasks.toLowerCase().includes("as needed") ||
            item.tasks.toLowerCase().includes("when needed") ||
            item.tasks.toLowerCase().includes("if needed")
          ),
      )
      .map((item, index) => ({
        id: `${activeFrequency}_${index}`,
        description: item.tasks,
        pageReference: item.pageReference,
      }))
  }

  // Get completed checklists for the current frequency
  const getCompletedChecklists = () => {
    if (!maintenanceHistory) return []

    if (activeFrequency.toLowerCase() === "other") {
      // For "other" category, include both regular "other" checklists and individual "as needed" tasks
      return maintenanceHistory
        .filter((history) => history.frequency.toLowerCase() === "other" || history.isAsNeededTask === true)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)) // Sort by date, newest first
    } else if (activeFrequency.toLowerCase() === "as needed") {
      // For "as needed" category, include all "as needed" tasks
      return maintenanceHistory
        .filter((history) => history.frequency.toLowerCase() === "as needed" || history.isAsNeededTask === true)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)) // Sort by date, newest first
    } else if (activeFrequency.toLowerCase() === "per use") {
      // For "per use" category
      return maintenanceHistory
        .filter((history) => history.frequency.toLowerCase() === "per use")
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)) // Sort by date, newest first
    } else {
      // For other frequencies, keep the original behavior
      return maintenanceHistory
        .filter((history) => history.frequency.toLowerCase() === activeFrequency.toLowerCase())
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)) // Sort by date, newest first
    }
  }

  // Check if all tasks are completed
  const areAllTasksCompleted = () => {
    const tasks = getTasksForFrequency()
    if (tasks.length === 0) return false

    return tasks.every((task) => checkedTasks[task.id])
  }

  // Handle saving the checklist
  const handleSaveChecklist = async () => {
    if (!maintenancePlan) {
      showToast("No maintenance plan available", "error")
      return
    }

    const tasks = getTasksForFrequency()
    if (tasks.length === 0) {
      showToast(`No ${activeFrequency} tasks found in the maintenance plan`, "error")
      return
    }

    if (!areAllTasksCompleted()) {
      showToast("Please complete all tasks before saving", "error")
      return
    }

    setIsSubmitting(true)

    try {
      const now = new Date()
      const currentPeriod = getCurrentPeriod(activeFrequency)

      // Create the checklist record
      const checklistRecord = {
        frequency: activeFrequency,
        period: currentPeriod,
        completedAt: now.toISOString(),
        completedBy: device.assignedTo,
        tasks: tasks.map((task) => {
          return {
            id: task.id,
            description: task.description,
            completed: checkedTasks[task.id] || false,
            notes: taskNotes[task.id] || "",
            noteMetadata: taskNotes[task.id]
              ? {
                  author: device.assignedTo,
                  timestamp: now.toISOString(),
                }
              : null,
          }
        }),
      }

      // Update the maintenance history
      const updatedHistory = [...(maintenanceHistory || [])]

      // Check if there's already a record for this period
      const existingIndex = updatedHistory.findIndex(
        (history) =>
          history.frequency.toLowerCase() === activeFrequency.toLowerCase() && history.period === currentPeriod,
      )

      if (existingIndex >= 0) {
        // Update existing record
        updatedHistory[existingIndex] = checklistRecord
      } else {
        // Add new record
        updatedHistory.push(checklistRecord)
      }

      // Update the device in Firebase
      const updatedDevice = {
        ...device,
        maintenanceHistory: updatedHistory,
        lastMaintenance: now.toISOString().split("T")[0],
      }

      // If this is the first time saving the maintenance plan, add a createdAt timestamp
      if (!device.maintenancePlan.createdAt) {
        updatedDevice.maintenancePlan = {
          ...updatedDevice.maintenancePlan,
          createdAt: now.toISOString(),
        }
      }

      await setDoc(doc(db, "Devices", device.id), updatedDevice)

      // Update local state
      setMaintenanceHistory(updatedHistory)

      showToast(
        `${activeFrequency.charAt(0).toUpperCase() + activeFrequency.slice(1)} maintenance checklist saved successfully!`,
        "success",
      )
    } catch (error) {
      console.error("Error saving maintenance checklist:", error)
      showToast("Failed to save maintenance checklist", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle saving individual "as needed" task
  const handleSaveAsNeededTask = async (taskId) => {
    if (!maintenancePlan) {
      showToast("No maintenance plan available", "error")
      return
    }

    if (!checkedTasks[taskId]) {
      showToast("Please complete the task before saving", "error")
      return
    }

    // Find the task
    const tasks = getTasksForFrequency()
    const task = tasks.find((t) => t.id === taskId)

    if (!task) {
      showToast("Task not found", "error")
      return
    }

    setIsSubmitting(true)

    try {
      const now = new Date()

      // Create a special record just for this task
      const checklistRecord = {
        frequency: "As Needed",
        period: `${now.toISOString().split("T")[0]}_${taskId}`, // Unique period for each completion
        completedAt: now.toISOString(),
        completedBy: device.assignedTo,
        tasks: [
          {
            id: taskId,
            description: task.description,
            completed: true,
            notes: taskNotes[taskId] || "",
            noteMetadata: taskNotes[taskId]
              ? {
                  author: device.assignedTo,
                  timestamp: now.toISOString(),
                }
              : null,
          },
        ],
        isAsNeededTask: true, // Mark this as a special "as needed" task
      }

      // Update the maintenance history
      const updatedHistory = [...(maintenanceHistory || []), checklistRecord]

      // Update the device in Firebase
      const updatedDevice = {
        ...device,
        maintenanceHistory: updatedHistory,
        lastMaintenance: now.toISOString().split("T")[0],
      }

      // If this is the first time saving the maintenance plan, add a createdAt timestamp
      if (!device.maintenancePlan.createdAt) {
        updatedDevice.maintenancePlan = {
          ...updatedDevice.maintenancePlan,
          createdAt: now.toISOString(),
        }
      }

      await setDoc(doc(db, "Devices", device.id), updatedDevice)

      // Update local state
      setMaintenanceHistory(updatedHistory)

      // Reset just this task
      setCheckedTasks({
        ...checkedTasks,
        [taskId]: false,
      })
      setTaskNotes({
        ...taskNotes,
        [taskId]: "",
      })

      showToast(`"As needed" task completed and saved to history!`, "success")
    } catch (error) {
      console.error("Error saving task:", error)
      showToast("Failed to save task", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Frequency tab button
  const FrequencyTab = ({ label, frequency }) => {
    const isFrequencyOverdue = isOverdue(frequency.toLowerCase())

    return (
      <button
        onClick={() => setActiveFrequency(frequency.toLowerCase())}
        style={{
          padding: "8px 12px",
          background:
            activeFrequency === frequency.toLowerCase()
              ? isFrequencyOverdue
                ? "#dc3545"
                : "#007bff"
              : isFrequencyOverdue
                ? "#f8d7da"
                : "#f0f0f0",
          color: activeFrequency === frequency.toLowerCase() ? "white" : isFrequencyOverdue ? "#721c24" : "#333",
          border: "none",
          borderRadius: "5px 5px 0 0",
          cursor: "pointer",
          marginRight: "5px",
          fontWeight: activeFrequency === frequency.toLowerCase() ? "bold" : "normal",
          position: "relative",
        }}
      >
        {label}
        {isFrequencyOverdue && (
          <span
            style={{
              position: "absolute",
              top: "-8px",
              right: "-8px",
              background: "#dc3545",
              color: "white",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            !
          </span>
        )}
      </button>
    )
  }

  // View tab button
  const ViewTab = ({ label, view }) => (
    <button
      onClick={() => setActiveView(view)}
      style={{
        padding: "8px 12px",
        background: activeView === view ? "#28a745" : "#f0f0f0",
        color: activeView === view ? "white" : "#333",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        marginRight: "5px",
        fontWeight: activeView === view ? "bold" : "normal",
      }}
    >
      {label}
    </button>
  )

  // Check if a checklist is completed for the current period
  const isCurrentPeriodCompleted = () => {
    if (!maintenanceHistory) return false

    const currentPeriod = getCurrentPeriod(activeFrequency)

    return maintenanceHistory.some(
      (history) =>
        history.frequency.toLowerCase() === activeFrequency.toLowerCase() && history.period === currentPeriod,
    )
  }

  // Render deadline information
  const renderDeadlineInfo = () => {
    // Don't show deadline info for "other" or "as needed" frequency
    if (activeFrequency.toLowerCase() === "other" || activeFrequency.toLowerCase() === "as needed") {
      return null
    }

    const deadline = getDeadline(activeFrequency)
    const isCurrentOverdue = isOverdue(activeFrequency)
    const isCompleted = isCurrentPeriodCompleted()
    const nextPeriodStart = isCompleted ? getNextPeriod(activeFrequency) : null

    // Get frequency-specific message
    const getFrequencyMessage = () => {
      if (isCompleted) {
        switch (activeFrequency.toLowerCase()) {
          case "per use":
            return `Per Use tasks completed. These should be performed each time the device is used.`
          case "daily":
            return `Daily tasks completed for today. Next checklist will be due on ${nextPeriodStart.toLocaleDateString()} at 11:59 PM.`
          case "weekly":
            return `Weekly tasks completed for this week. Next checklist will be due on ${nextPeriodStart.toLocaleDateString()} at 11:59 PM.`
          case "monthly":
            return `Monthly tasks completed for this month. Next checklist will be due on ${nextPeriodStart.toLocaleDateString()} at 11:59 PM.`
          case "quarterly":
            return `Quarterly tasks completed for this quarter. Next checklist will be due on ${nextPeriodStart.toLocaleDateString()} at 11:59 PM.`
          case "yearly":
            return `Yearly tasks completed for this year. Next checklist will be due on ${nextPeriodStart.toLocaleDateString()} at 11:59 PM.`
          default:
            return `Tasks completed for the current period. Next checklist will be due on ${nextPeriodStart.toLocaleDateString()} at 11:59 PM.`
        }
      } else {
        switch (activeFrequency.toLowerCase()) {
          case "per use":
            return "Per Use tasks should be performed each time the device is used."
          case "daily":
            return "Daily tasks reset at midnight. Any uncompleted tasks will be marked as overdue."
          case "weekly":
            return "Weekly tasks reset at the end of each week (Saturday 11:59 PM). Any uncompleted tasks will be marked as overdue."
          case "monthly":
            return "Monthly tasks reset at the end of each month. Any uncompleted tasks will be marked as overdue."
          case "quarterly":
            return "Quarterly tasks reset at the end of each quarter. Any uncompleted tasks will be marked as overdue."
          case "yearly":
            return "Yearly tasks reset at the end of each year (December 31). Any uncompleted tasks will be marked as overdue."
          default:
            return "Tasks will reset at the deadline. Any uncompleted tasks will be marked as overdue."
        }
      }
    }

    return (
      <div
        style={{
          padding: "10px",
          backgroundColor: isCompleted ? "#d4edda" : isCurrentOverdue ? "#f8d7da" : "#fff3cd",
          borderRadius: "5px",
          marginBottom: "15px",
          border: `1px solid ${isCompleted ? "#c3e6cb" : isCurrentOverdue ? "#f5c6cb" : "#ffeeba"}`,
          color: isCompleted ? "#155724" : isCurrentOverdue ? "#721c24" : "#856404",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{isCompleted ? "Next Deadline:" : "Current Deadline:"}</strong>{" "}
            {isCompleted
              ? nextPeriodStart
                ? nextPeriodStart.toLocaleString()
                : "N/A"
              : deadline
                ? deadline.toLocaleString()
                : "N/A"}
          </div>
          <div>
            {!isCompleted && showLiveTimer && deadline ? (
              <span style={{ fontWeight: "bold" }}>{formatTimeRemaining(deadline)}</span>
            ) : (
              <span>
                {isCurrentOverdue && !isCompleted
                  ? "OVERDUE"
                  : isCompleted && nextPeriodStart
                    ? `Next checklist in ${Math.ceil((nextPeriodStart - currentTime) / (1000 * 60 * 60 * 24))} days`
                    : deadline
                      ? `Due in ${Math.ceil((deadline - currentTime) / (1000 * 60 * 60 * 24))} days`
                      : "No specific deadline"}
              </span>
            )}
          </div>
        </div>
        <div style={{ marginTop: "5px", fontSize: "0.9em" }}>
          {isCurrentOverdue && !isCompleted ? (
            <span>
              <strong>Warning:</strong> This {activeFrequency} maintenance checklist is overdue. Please complete it as
              soon as possible.
            </span>
          ) : (
            <span>{getFrequencyMessage()}</span>
          )}
        </div>
        {!isCompleted && deadline && (
          <div style={{ marginTop: "5px", textAlign: "right" }}>
            <button
              onClick={() => setShowLiveTimer(!showLiveTimer)}
              style={{
                background: "none",
                border: "none",
                textDecoration: "underline",
                cursor: "pointer",
                color: "inherit",
                fontSize: "0.85em",
              }}
            >
              {showLiveTimer ? "Show static time" : "Show countdown"}
            </button>
          </div>
        )}
      </div>
    )
  }

  // Render special message for "other" tasks
  const renderOtherTasksMessage = () => {
    return (
      <div
        style={{
          padding: "10px",
          backgroundColor: "#e2e3e5",
          borderRadius: "5px",
          marginBottom: "15px",
          border: "1px solid #d6d8db",
          color: "#383d41",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Other Tasks:</strong> These are miscellaneous maintenance tasks that don't follow a regular schedule.
          They can be completed as needed without a specific deadline.
        </p>
      </div>
    )
  }

  // Render special message for "as needed" tasks
  const renderAsNeededTasksMessage = () => {
    return (
      <div
        style={{
          padding: "10px",
          backgroundColor: "#e2e3e5",
          borderRadius: "5px",
          marginBottom: "15px",
          border: "1px solid #d6d8db",
          color: "#383d41",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>As Needed Tasks:</strong> These tasks should be performed when specific conditions are met, such as
          after battery replacement or when performance degrades. Each task can be completed individually.
        </p>
      </div>
    )
  }

  // Render special message for "per use" tasks
  const renderPerUseTasksMessage = () => {
    return (
      <div
        style={{
          padding: "10px",
          backgroundColor: "#e2e3e5",
          borderRadius: "5px",
          marginBottom: "15px",
          border: "1px solid #d6d8db",
          color: "#383d41",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Per Use Tasks:</strong> These tasks should be performed each time the device is used, such as the
          switch-on test and basic functionality checks.
        </p>
      </div>
    )
  }

  if (!maintenancePlan) {
    return (
      <StyledBox>
        <h3>Maintenance Checklist</h3>
        <p>No maintenance plan available. Please generate a maintenance plan first.</p>
      </StyledBox>
    )
  }

  return (
    <div>
      <h3>Maintenance Checklist</h3>

      {/* View Tabs */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "flex-end" }}>
        <ViewTab label="Current Checklists" view="current" />
        <ViewTab label="History" view="history" />
      </div>

      {/* Frequency Tabs - Dynamically generated from MAINTENANCE_FREQUENCIES */}
      <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap" }}>
        {MAINTENANCE_FREQUENCIES.map((freq) => {
          // Only show frequency tabs that have tasks
          const hasTasks = maintenancePlan.schedule.some((item) => item.frequency.toLowerCase() === freq.key)

          if (!hasTasks) return null

          return <FrequencyTab key={freq.key} label={freq.label} frequency={freq.key} />
        })}
      </div>

      {activeView === "current" ? (
        <StyledBox>
          <h4>{activeFrequency.charAt(0).toUpperCase() + activeFrequency.slice(1)} Maintenance Tasks</h4>

          {/* Frequency-specific information */}
          {activeFrequency.toLowerCase() === "other"
            ? renderOtherTasksMessage()
            : activeFrequency.toLowerCase() === "as needed"
              ? renderAsNeededTasksMessage()
              : activeFrequency.toLowerCase() === "per use"
                ? renderPerUseTasksMessage()
                : renderDeadlineInfo()}

          {getTasksForFrequency().length === 0 ? (
            <p>No {activeFrequency} tasks found in the maintenance plan.</p>
          ) : (
            <>
              <div style={{ marginBottom: "20px" }}>
                {isCurrentPeriodCompleted() && activeFrequency.toLowerCase() !== "as needed" && (
                  <div
                    style={{
                      padding: "10px",
                      backgroundColor: "#d4edda",
                      borderRadius: "5px",
                      marginBottom: "15px",
                      border: "1px solid #c3e6cb",
                    }}
                  >
                    <p style={{ margin: 0, color: "#155724" }}>
                      <strong>✓ Completed</strong> - This {activeFrequency} checklist has been completed for the current
                      period.
                    </p>
                  </div>
                )}
                {isCurrentPeriodCompleted() && activeFrequency.toLowerCase() !== "as needed" && (
                  <div
                    style={{
                      padding: "10px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "5px",
                      marginBottom: "15px",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    <p style={{ margin: 0, color: "#6c757d" }}>
                      <strong>Note:</strong> This checklist is locked. Checkboxes and comments cannot be modified after
                      saving.
                    </p>
                  </div>
                )}

                {getTasksForFrequency().map((task, index) => (
                  <div
                    key={task.id}
                    style={{
                      marginBottom: "15px",
                      padding: "15px",
                      border: `1px solid ${
                        activeFrequency.toLowerCase() !== "other" &&
                        activeFrequency.toLowerCase() !== "as needed" &&
                        activeFrequency.toLowerCase() !== "per use" &&
                        isOverdue(activeFrequency) &&
                        !isCurrentPeriodCompleted()
                          ? "#f5c6cb"
                          : "#ddd"
                      }`,
                      borderRadius: "5px",
                      backgroundColor: checkedTasks[task.id]
                        ? "#f8f9fa"
                        : activeFrequency.toLowerCase() !== "other" &&
                            activeFrequency.toLowerCase() !== "as needed" &&
                            activeFrequency.toLowerCase() !== "per use" &&
                            isOverdue(activeFrequency) &&
                            !isCurrentPeriodCompleted()
                          ? "#fff5f5"
                          : "white",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      <input
                        type="checkbox"
                        id={task.id}
                        checked={checkedTasks[task.id] || false}
                        onChange={(e) => {
                          setCheckedTasks({
                            ...checkedTasks,
                            [task.id]: e.target.checked,
                          })
                        }}
                        disabled={isCurrentPeriodCompleted() && activeFrequency.toLowerCase() !== "as needed"}
                        style={{
                          marginRight: "10px",
                          marginTop: "4px",
                          cursor:
                            isCurrentPeriodCompleted() && activeFrequency.toLowerCase() !== "as needed"
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            isCurrentPeriodCompleted() && activeFrequency.toLowerCase() !== "as needed" ? 0.7 : 1,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <label htmlFor={task.id} style={{ fontWeight: "500", cursor: "pointer" }}>
                          {task.description}
                        </label>
                        {task.pageReference && task.pageReference !== "Not specified in document" && (
                          <span style={{ color: "#0056b3", fontSize: "0.85em", marginLeft: "5px" }}>
                            [{task.pageReference}]
                          </span>
                        )}

                        {/* Check if this is an "as needed" task */}
                        {(activeFrequency.toLowerCase() === "other" || activeFrequency.toLowerCase() === "as needed") &&
                          task.description.toLowerCase().includes("as needed") && (
                            <span
                              style={{
                                backgroundColor: "#e2e3e5",
                                color: "#383d41",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "0.8em",
                                marginLeft: "8px",
                              }}
                            >
                              As Needed
                            </span>
                          )}

                        {checkedTasks[task.id] && (
                          <div style={{ marginTop: "10px" }}>
                            {getCompletedChecklists().length > 0 &&
                              getCompletedChecklists()[0].tasks.find((t) => t.id === task.id)?.noteMetadata && (
                                <div
                                  style={{
                                    fontSize: "0.85em",
                                    color: "#6c757d",
                                    marginBottom: "5px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span>
                                    By:{" "}
                                    {
                                      getCompletedChecklists()[0].tasks.find((t) => t.id === task.id).noteMetadata
                                        .author
                                    }
                                  </span>
                                  <span>
                                    {new Date(
                                      getCompletedChecklists()[0].tasks.find((t) => t.id === task.id).noteMetadata
                                        .timestamp,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            <textarea
                              placeholder="Add notes about how this task was completed..."
                              value={taskNotes[task.id] || ""}
                              onChange={(e) => {
                                setTaskNotes({
                                  ...taskNotes,
                                  [task.id]: e.target.value,
                                })
                              }}
                              disabled={isCurrentPeriodCompleted() && activeFrequency.toLowerCase() !== "as needed"}
                              style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ced4da",
                                minHeight: "80px",
                                backgroundColor:
                                  isCurrentPeriodCompleted() && activeFrequency.toLowerCase() !== "as needed"
                                    ? "#f8f9fa"
                                    : "white",
                                cursor:
                                  isCurrentPeriodCompleted() && activeFrequency.toLowerCase() !== "as needed"
                                    ? "not-allowed"
                                    : "text",
                              }}
                            />

                            {/* Add individual save button for "as needed" tasks */}
                            {(activeFrequency.toLowerCase() === "as needed" ||
                              (activeFrequency.toLowerCase() === "other" &&
                                task.description.toLowerCase().includes("as needed"))) && (
                              <div style={{ marginTop: "10px" }}>
                                <StyledButton
                                  onClick={() => handleSaveAsNeededTask(task.id)}
                                  disabled={isSubmitting}
                                  loading={isSubmitting}
                                  style={{ padding: "6px 12px", fontSize: "0.9em" }}
                                >
                                  Complete This Task
                                </StyledButton>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activeFrequency.toLowerCase() !== "other" && activeFrequency.toLowerCase() !== "as needed" && (
                <StyledButton
                  onClick={handleSaveChecklist}
                  disabled={!areAllTasksCompleted() || isSubmitting || isCurrentPeriodCompleted()}
                  loading={isSubmitting}
                >
                  {isCurrentPeriodCompleted() ? "Already Completed" : "Complete Checklist"}
                </StyledButton>
              )}
            </>
          )}
        </StyledBox>
      ) : (
        <StyledBox>
          <h4>{activeFrequency.charAt(0).toUpperCase() + activeFrequency.slice(1)} Maintenance History</h4>

          {getCompletedChecklists().length === 0 ? (
            <p>No completed {activeFrequency} checklists found.</p>
          ) : (
            <div>
              {getCompletedChecklists().map((checklist, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "20px",
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                  }}
                >
                  <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                    <h5 style={{ margin: 0 }}>
                      {checklist.isAsNeededTask ? (
                        <span>
                          "As Needed" Task Completed on {new Date(checklist.completedAt).toLocaleDateString()} at{" "}
                          {new Date(checklist.completedAt).toLocaleTimeString()}
                        </span>
                      ) : (
                        <span>
                          Completed on {new Date(checklist.completedAt).toLocaleDateString()} at{" "}
                          {new Date(checklist.completedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </h5>
                    <span>By: {checklist.completedBy}</span>
                  </div>

                  <div>
                    {checklist.tasks.map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        style={{
                          marginBottom: "10px",
                          padding: "10px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start" }}>
                          <span style={{ marginRight: "10px", color: "#28a745" }}>✓</span>
                          <div style={{ width: "100%" }}>
                            <div>
                              {task.description}
                              {task.description.toLowerCase().includes("as needed") && (
                                <span
                                  style={{
                                    backgroundColor: "#e2e3e5",
                                    color: "#383d41",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "0.8em",
                                    marginLeft: "8px",
                                  }}
                                >
                                  As Needed
                                </span>
                              )}
                            </div>
                            {task.notes && (
                              <div
                                style={{
                                  marginTop: "5px",
                                  padding: "8px",
                                  backgroundColor: "white",
                                  borderRadius: "4px",
                                  border: "1px solid #e9ecef",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "5px",
                                    fontSize: "0.85em",
                                    color: "#6c757d",
                                  }}
                                >
                                  {task.noteMetadata ? (
                                    <>
                                      <span>By: {task.noteMetadata.author}</span>
                                      <span>{new Date(task.noteMetadata.timestamp).toLocaleString()}</span>
                                    </>
                                  ) : (
                                    <span>Note added</span>
                                  )}
                                </div>
                                <strong>Notes:</strong> {task.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </StyledBox>
      )}
    </div>
  )
}

export default MaintenanceChecklist
