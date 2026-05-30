# Publish a GitHub Release

## Files (after `npm run dist`)

| File | Path |
|------|------|
| Installer | `dist-setup/X360-Manager-Setup-1.6.2.exe` |
| Build stamp | `dist-setup/BUILD_INFO.txt` (UTC time — confirm you have a fresh build) |
| Portable ZIP | `dist-setup/X360-Manager-Portable-1.6.2.zip` (optional; run `create-portable-build.ps1`) |
| Env template | `.env.example` |

## Steps

1. **Close X360 Manager** (and stop `npm run dev`) so `dist-setup\win-unpacked` is not locked.
2. Build: `npm run dist` — writes to `dist-build-temp/` then copies into `dist-setup/`.
3. Check **`dist-setup/BUILD_INFO.txt`** and that the `.exe` **Date modified** is today (after your last code change).
4. Tag and push: `git tag v1.6.2 && git push origin v1.6.2`
5. Open https://github.com/Supermedo/x360-manager/releases/new
6. Choose tag **v1.6.2**, title **X360 Manager v1.6.2**
7. Paste the description from `.github/RELEASE_BODY_v1.6.2.md`
8. Upload the `.exe`, `.zip`, and `.env.example` as release assets
9. Publish release

## Using GitHub CLI (after `gh auth login`)

```powershell
gh release create v1.6.2 `
  --title "X360 Manager v1.6.2" `
  --notes-file .github/RELEASE_BODY_v1.6.2.md `
  "dist-setup/X360-Manager-Setup-1.6.2.exe" `
  "dist-setup/X360-Manager-Portable-1.6.2.zip" `
  ".env.example"
```
