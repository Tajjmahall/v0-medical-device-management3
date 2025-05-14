"use client"

import { useState } from "react"
import { Button, CircularProgress, Snackbar, Alert } from "@mui/material"
import { testOpenAI } from "../utils/openaiTest"

const OpenAITestButton = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [open, setOpen] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    try {
      const response = await testOpenAI()
      setResult(response)
      setOpen(true)
    } catch (error) {
      setResult({
        success: false,
        error: error.message || "An unknown error occurred",
      })
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={handleTest}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? "Testing OpenAI..." : "Test OpenAI Connection"}
      </Button>

      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity={result?.success ? "success" : "error"} sx={{ width: "100%" }}>
          {result?.success
            ? "OpenAI connection successful!"
            : `OpenAI connection failed: ${result?.error || "Unknown error"}`}
        </Alert>
      </Snackbar>
    </>
  )
}

export default OpenAITestButton
