# MYWORK AZZURO native layer

This Tauri 2 layer owns Windows Credential Manager integration and one-time
read-only import of workspaces created by MYWORK AZZURO 0.4 and earlier.

Operational data is stored in Supabase Postgres from MYWORK AZZURO 0.5 onward.

## Frontend dependencies

Install the Tauri JavaScript API and CLI from the project root:

```powershell
npm install @tauri-apps/api
npm install --save-dev @tauri-apps/cli
```

Add this script to the root `package.json`:

```json
{
  "scripts": {
    "tauri": "tauri"
  }
}
```

Then use `npm run tauri dev` for the desktop development build.

## Command contract

```ts
import { invoke } from '@tauri-apps/api/core';

const legacyState = await invoke<Record<string, unknown> | null>('load_state');

await invoke('set_secret', { secretId: link.id, secret: password });
const password = await invoke<string | null>('get_secret', {
  secretId: link.id,
});
await invoke('delete_secret', { secretId: link.id });
```

Use an immutable link ID as `secretId`. Link passwords are never sent to
Supabase; the desktop app stores them locally in Windows Credential Manager.
Supabase Auth session material uses a separate credential service.

On Windows, saved link passwords use the service name `com.azzuro.mywork.links`
and Supabase sessions use `com.azzuro.mywork.auth`. An existing
`mywork-azzuro.sqlite3` file is read once during the first cloud workspace
creation, then is never created or modified by the 0.5 desktop app.
