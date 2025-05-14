"use client"

import dynamic from "next/dynamic"

// Use dynamic import with no SSR to prevent document not defined errors
const MedicalDeviceSystem = dynamic(() => import("../src/App"), { ssr: false })

export default function Page() {
  return <MedicalDeviceSystem />
}
