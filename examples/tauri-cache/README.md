# Tauri cache example

This is a deliberately small Tauri v2 application used by the cache integration
workflow. It has a lockfile-backed Node dependency and a Rust crate so the
workflow exercises frontend, Cargo, and `src-tauri/target` cache paths.

Run it locally with:

```bash
npm ci
npm run tauri build
```
