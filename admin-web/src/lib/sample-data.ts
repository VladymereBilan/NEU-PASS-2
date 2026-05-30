export const demoUsers = [
  { username: "guard01", status: "Active" },
  { username: "guard02", status: "Blocked" },
  { username: "guard03", status: "Active" }
];

export const auditLogs = [
  { action: "Admin login", actor: "admin01", time: "2026-05-30 08:10 AM" },
  { action: "Visitor approval", actor: "guard01", time: "2026-05-30 09:15 AM" },
  { action: "QR issued", actor: "system", time: "2026-05-30 09:16 AM" },
  { action: "Checkout completed", actor: "guard03", time: "2026-05-30 03:40 PM" }
];

export const visitors = [
  {
    visitorName: "Juan Dela Cruz",
    purpose: "Enrollment",
    status: "Active",
    timeIn: "2026-05-30 08:45 AM",
    timeOut: "-",
    qrStatus: "Active",
    expirationTime: "2026-05-30 04:00 PM"
  },
  {
    visitorName: "Maria Santos",
    purpose: "Inquiries",
    status: "Completed",
    timeIn: "2026-05-30 09:10 AM",
    timeOut: "2026-05-30 10:30 AM",
    qrStatus: "Used/Invalid",
    expirationTime: "2026-05-30 06:00 PM"
  },
  {
    visitorName: "Carlos Reyes",
    purpose: "Others",
    status: "Pending",
    timeIn: "-",
    timeOut: "-",
    qrStatus: "Inactive",
    expirationTime: "-"
  }
];

export function getReportStats() {
  const now = new Date("2026-05-30T15:45:00");
  return {
    totalVisitors: visitors.length,
    activeVisitors: visitors.filter((v) => v.status === "Active").length,
    completedVisitors: visitors.filter((v) => v.status === "Completed").length,
    pendingVisitors: visitors.filter((v) => v.status === "Pending").length,
    expiredQrPasses: visitors.filter((v) => v.qrStatus === "Used/Invalid").length,
    purposeCounts: {
      Inquiries: 1,
      Enrollment: 1,
      "Tuition Fee Payment": 0,
      "Other Payments": 0,
      Others: 1
    },
    daily: {
      visitorsToday: 3,
      completedToday: 1,
      activeToday: 1
    },
    monthly: {
      visitorsThisMonth: 3,
      completedThisMonth: 1
    },
    generatedAt: now.toISOString()
  };
}
