## Cause
Vite fails to resolve `@capacitor/filesystem` from `src/lib/exportTarget.ts`, which crashes the whole bundle and produces a blank screen. The `/* @vite-ignore */` hint isn't enough because the literal string is still statically analyzed in dev.

## Fix
Hide the specifier behind a runtime variable so Vite skips static resolution entirely, and only attempt the import on a real native (Capacitor) device:

```ts
async function writeViaCapacitor(blob, filename) {
  if (!isCapacitor()) return false;
  try {
    const name = ["@capacitor", "filesystem"].join("/");
    const mod: any = await import(/* @vite-ignore */ name).catch(() => null);
    ...
  } catch { return false; }
}
```

No other file changes are needed. After this edit the web build resolves cleanly and the app renders again; the native code path remains intact for Capacitor packaging.