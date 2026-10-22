# YASTER RTM Dashboard (React)

Workforce management and real-time monitoring dashboard for Yeastar CSV reports rewritten as a modern React SPA using Vite, TypeScript, and Tailwind CSS.

## Features
- **Data Import**: Upload Yeastar CDR, Agent Login Activity, and Agent Pause Activity CSV exports.
- **Reporting Filters**: Daily and Month-to-Date (MTD) filtering across all agents or per individual agent.
- **Overview & KPI Dashboard**: Aggregate metrics for total calls, answered, abandoned, login time, AHT (Average Handling Time), utilization, and occupancy.
- **Agent Performance**: Comparative analysis of answer rate, talk time, login duration, pause duration, and utilization per agent.
- **Attendance & Schedule**: Per-agent, per-day shift scheduling (Work/OFF/Leave), start/end times, grace period, first login detection, and late minutes calculation.
- **Break Compliance**: Configurable planned break slots per agent/day with automatic matching against actual pause timestamps, grace period tolerance, and overrun detection.
- **Pause Analysis**: Detailed breakdown of pause instances, total auxiliary time, and categorized pause reasons.
- **Data Persistence & Portability**: Local browser storage with JSON backup export and restore capabilities.

## Getting Started

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Data Privacy & Architecture
- All calculations, CSV parsing, and schedule storage happen strictly in the browser.
- No live Yeastar API credentials or external servers are required.
