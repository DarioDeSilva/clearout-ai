# Git & GitHub Rules — Clearout AI

## Core Philosophy

**`main` branch is always deployable and always works.** Never push broken code to main.

**`dev` branch is your working branch.** You commit to dev, test, then create PR to main.

## Branch Strategy

### main
- **Always works.** Deployed to Vercel.
- **Only merged via Pull Request.** No direct pushes.
- **Protected:** Requires PR review before merge.
- **What lives here:** Only tested, working code.

### dev
- **Your daily working branch.**
- **Not necessarily working.** It's okay if it's broken.
- **Merges to main via PR** when features are ready.

## Commit Message Format

```
<type>: <subject>

type = feat | fix | refactor | docs | test | chore
subject = clear, specific, lowercase, imperative

Examples:
feat: add email waitlist to landing page
fix: handle null values in item card
test: add tests for Zod validation
docs: update README
```

## Commit Attribution & Style

- **Never credit Claude or any AI tool in commits or pushes.** No `Co-Authored-By: Claude` lines, no mentions of AI assistance in commit messages, PR descriptions, or PR titles.
- **Never use em dashes.** In commit messages, PR descriptions, or any text pushed to GitHub, use a comma, colon, or period instead.

## Workflow

### Starting Your Day
```bash
git checkout dev
git pull origin dev
# Start coding
```

### Committing
```bash
git add .
git commit -m "feat: implement email validation"
git push origin dev
```

### When a Feature Is Ready
1. Test locally: `npm run dev`
2. Create PR on GitHub (dev → main)
3. Review your own code
4. Merge via GitHub UI
5. Verify deployment on Vercel

## Rules You CANNOT Break

- Never push directly to main
- Never force push main or dev
- Never commit secrets
- Never rewrite history on main/dev
- Never credit Claude or any AI tool in a commit, push, or PR
- Never use em dashes in a commit, push, or PR

## GitHub Settings

1. **Branch Protection on `main`**
   - Settings → Branches
   - Require pull request before merging
   - Require status checks (if using CI)

2. **Default Branch:** should be `main`

3. **Visibility:** Public (for recruiting portfolio)

## Recruiting Signal

Recruiters check:
- Commit history is clean (meaningful messages)
- main branch is always working
- Features are isolated (each PR is one feature)
- Code reviews own PRs
- Frequent small commits (not one massive dump)
- No secrets in history
