# YASTER RTM Dashboard

Standalone browser-based RTM dashboard for manually imported Yeastar CSV reports.

## Features
- Import CDR, Agent Login Activity, and Agent Pause Activity CSV exports.
- Daily and month-to-date filters, including agent filtering.
- Agent performance overview and pause analysis.
- Per-agent, per-day work schedule and attendance status (On Time / Late / Absent).
- Per-agent, per-day break planning and compliance checks.
- Local browser storage with backup download and restore.

## Run
Open `index.html` in a modern browser. No build step is required.

## Important notes
- This is import-only and does not connect to a live Yeastar API.
- Imported reports, schedules, and break plans are stored in the current browser's local storage. Use the backup/restore feature when moving devices or browsers.
- CSV header formats and metric calculations should be validated against your team's actual Yeastar exports before relying on the report for operational decisions.
