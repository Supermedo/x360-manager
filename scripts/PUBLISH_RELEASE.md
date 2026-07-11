# Publish a GitHub Release

## Files (after `npm run dist`)

| File | Path |
|------|------|
| Installer | `dist-setup/X360-Manager-Setup-1.6.4.exe` |
| Build stamp | `dist-setup/BUILD_INFO.txt` |
| Portable ZIP | `dist-setup/X360-Manager-Portable-1.6.4.zip` (optional) |
| Env template | `.env.example` |

## Steps

1. Close X360 Manager and stop `npm run dev`.
2. Build: `npm run dist`
3. Check `dist-setup/BUILD_INFO.txt` and `.exe` date modified.
4. Tag and push: `git tag v1.6.4 && git push origin v1.6.4`
5. Create release with GitHub CLI:

```powershell
gh release create v1.6.4 `
  --title "X360 Manager v1.6.4" `
  --notes-file .github/RELEASE_BODY_v1.6.4.md `
  "dist-setup/X360-Manager-Setup-1.6.4.exe" `
  ".env.example"
```

Or open https://github.com/Supermedo/x360-manager/releases/new — choose tag **v1.6.4**, paste `.github/RELEASE_BODY_v1.6.4.md`, upload the installer.

## Security checklist before release

- [ ] No `.env` in the repo
- [ ] No API keys in source (use `.env` for ScreenScraper)
- [ ] Debug HTML demos removed from tree
