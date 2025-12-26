# Publishing Checklist for v1.1.0

## ✅ Completed Steps

- [x] Created feature branch: `feature/agent-wake-system`
- [x] Updated version: 1.0.13 → 1.1.0
- [x] Updated CHANGELOG.md with v1.1.0 entry
- [x] Built project successfully
- [x] Committed all changes
- [x] Pushed branch to GitHub
- [x] All tests passing (100% pass rate)

## 🔄 Next Steps

### 1. Create Pull Request on GitHub

Visit: https://github.com/treebird7/Myceliumail/pull/new/feature/agent-wake-system

**PR Title:**
```
feat: Agent Wake System & Action Dispatcher (v1.1.0)
```

**PR Description:**
Copy from `PR_DESCRIPTION.md` (already created)

### 2. Review and Merge PR

1. Review the changes on GitHub
2. Ensure CI/CD passes (if configured)
3. Merge the PR to `main`

### 3. Checkout Main and Pull

```bash
git checkout main
git pull origin main
```

### 4. Create Git Tag

```bash
git tag -a v1.1.0 -m "Release v1.1.0 - Agent Wake System & Action Dispatcher"
git push origin v1.1.0
```

### 5. Publish to npm

```bash
# Ensure you're on main branch with latest changes
git checkout main
git pull

# Build one more time to be sure
npm run build

# Publish to npm
npm publish

# Expected output:
# + myceliumail@1.1.0
```

### 6. Verify Publication

```bash
# Check npm
npm view myceliumail version
# Should show: 1.1.0

# Test global install
npm install -g myceliumail

# Verify --wake flag is available
mycmail watch --help
# Should show: --wake option
```

### 7. Create GitHub Release

1. Go to: https://github.com/treebird7/Myceliumail/releases/new
2. **Tag:** v1.1.0
3. **Title:** v1.1.0 - Agent Wake System & Action Dispatcher
4. **Description:** Copy from CHANGELOG.md v1.1.0 section
5. Click "Publish release"

### 8. Notify Agents (Optional)

```bash
# Send announcement to all agents
mycmail broadcast "🎉 Myceliumail v1.1.0 released!" \
  -m "New features: Agent Wake System, Action Dispatcher, and more. 
  
Key updates:
- mycmail watch --wake for automated responses
- Action dispatcher with [action: name] syntax
- Webhook support for production
- VS Code extension improvements

See CHANGELOG: https://github.com/treebird7/Myceliumail/blob/main/CHANGELOG.md

Update now: npm install -g myceliumail"
```

## 🔍 Post-Publish Verification

### Test the Published Package

```bash
# In a different directory (not the repo)
cd ~
mkdir test-mycmail-v1.1.0
cd test-mycmail-v1.1.0

# Install from npm
npm install -g myceliumail

# Verify version
mycmail --version
# Should show: 1.1.0

# Test --wake flag
mycmail watch --help | grep wake
# Should show: --wake option

# Clean up
cd ~
rm -rf test-mycmail-v1.1.0
```

## 📊 Success Metrics

After publishing, verify:
- [ ] npm shows version 1.1.0
- [ ] GitHub release created
- [ ] `--wake` flag available in global install
- [ ] Documentation accessible on GitHub
- [ ] No critical issues reported

## 🐛 Rollback Plan (If Needed)

If critical issues are found:

```bash
# Unpublish the version (within 72 hours)
npm unpublish myceliumail@1.1.0

# Or deprecate it
npm deprecate myceliumail@1.1.0 "Critical bug found, use 1.0.13 instead"

# Revert the tag
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0
```

## 📝 Notes

- **Current Branch:** feature/agent-wake-system
- **Target Branch:** main
- **Version:** 1.1.0
- **Commit:** 7b76622
- **Files Changed:** 17 files, +2,461 lines

## 🎉 Ready to Publish!

All preparation is complete. Follow the steps above to publish v1.1.0.

---

**Last Updated:** 2025-12-25
**Status:** Ready for PR and Publish
