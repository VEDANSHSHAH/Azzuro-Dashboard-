# MYWORK AZZURO native layer

This Tauri 2 layer owns durable local state and secure link passwords.

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

const state = await invoke<Record<string, unknown>>('load_state');
await invoke('save_state', { state });

await invoke('set_secret', { secretId: link.id, secret: password });
const password = await invoke<string | null>('get_secret', {
  secretId: link.id,
});
await invoke('delete_secret', { secretId: link.id });
```

Use an immutable link ID (preferably a UUID) as `secretId`. Store only the link's
metadata in normal app state, for example `username`, `url`, `secretId`, and
`hasPassword`. The backend rejects common plaintext password fields in
`save_state`.

On Windows, non-secret state is stored in the app data directory as
`mywork-azzuro.sqlite3`. Passwords are stored separately by Windows Credential
Manager under the service name `com.azzuro.mywork.links`.
