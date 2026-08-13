# MYWORK AZZURO

A private, local-first operations workspace for daily notes, property tasks,
cleaning logs, general rules, and operational links.

## What is included

- **Today’s Work** combines the current day’s notes and tasks.
- **Day-wise** always opens on today and keeps separate records for every date.
- **Work Calendar** shows tasks across the month and opens any day directly.
- **Task shifting** moves unfinished work to another operating day.
- **Assigned to** keeps task ownership visible on every task card.
- **Calls** can be scheduled with talking points, assigned, completed with a
  written outcome, and reviewed alongside the day's other work.
- **Call outcome points** can become linked follow-up tasks in one click, so an
  answer from a call immediately becomes the next accountable action.
- **Findings & outcomes** capture what a worker checked, discovered, or decided
  before or after a task is completed.
- **Linked follow-ups** create the next action directly from an existing task
  and keep both sides of the task trail visible and editable.
- **Things to Remember** schedules visible reminders for one date, every day,
  or an inclusive date range and surfaces them above the relevant daily work.
- **Cleaning Log** records property notes, prior cleans, and upcoming schedules.
- **General Rules** provides an autosaving operational knowledge base.
- **Links & Credentials** keeps website metadata in SQLite and passwords in
  Windows Credential Manager in the desktop build.
- Restrained animation, responsive navigation, keyboard-friendly dialogs, and
  reduced-motion support are built into the shared component system.

## Technology

- React 19 + TypeScript
- Vite
- Motion for React
- Tauri 2 desktop shell
- SQLite for non-secret application data
- Windows Credential Manager for passwords

## Run the web interface

```powershell
npm install
npm run dev
```

The browser version uses local browser storage for development and preview.
Use the desktop build for secure credential storage.

## Run the Windows desktop application

Install the Rust toolchain and the Tauri Windows prerequisites, then run:

```powershell
npm install
npm run tauri dev
```

Create a production installer with:

```powershell
npm run tauri build
```

The generated Windows installers are written to:

- `src-tauri/target/release/bundle/nsis/` for the standard setup executable.
- `src-tauri/target/release/bundle/msi/` for the Windows Installer package.

## Verification

```powershell
npm run typecheck
npm run build
```
