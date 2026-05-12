# Claude Code Setup Guide

This document explains how to use Claude Code effectively for building Clearout AI. Claude Code is a terminal-based tool that lets you delegate coding tasks to Claude with full context about your project.

## Quick Start

```bash
# Install Claude Code (if not already installed)
npm install -g @anthropic-ai/claude-code

# Initialize in your project
cd clearout-ai
claude code init

# Start a session
claude code
```

## How to Use Claude Code

### For general help:
```
claude: Help me implement the Gemini Vision extraction endpoint
```

### For specific files:
```
claude: Review lib/validators.ts and suggest improvements
claude: Write tests for the AI extraction logic in lib/gemini.ts
```

### For debugging:
```
claude: Why is this request timing out? [paste error]
claude: The job worker keeps getting stuck in "processing" state
```

### For architectural decisions:
```
claude: Should I use BullMQ or keep the custom jobs table? Here are the constraints...
claude: Walk me through the best way to structure the Supabase schema for items
```

## Project Context

Claude Code has access to your entire project structure. It understands:
- **Tech stack:** Next.js 14, TypeScript, Supabase, Gemini Vision API
- **Architecture:** Async job pipeline for AI processing, background workers
- **Code style:** See `.claude/rules/code-style.md`
- **Testing:** See `.claude/rules/testing.md`
- **Security:** See `.claude/rules/security.md`

## What Claude Code Can Do Well

✅ **Write production code** — new features, refactors, bug fixes
✅ **Generate tests** — unit tests, integration tests, fixtures
✅ **Debug with context** — paste an error, it reads your code and suggests fixes
✅ **Design architecture** — help you think through database schemas, API design
✅ **Code review** — paste a function and ask for improvements
✅ **Documentation** — write READMEs, API docs, architecture diagrams
✅ **Configuration** — set up environment, linting, build configs

❌ **Not good for:** Decisions only you can make (product strategy, user experience choices)
❌ **Not good for:** Debugging runtime issues without context (always paste the full error and relevant code)

## Rules & Guidelines

Claude Code reads the rules in `.claude/rules/`. These enforce:

- **Code style:** TypeScript, naming conventions, file organization
- **Testing:** Coverage targets, test structure, fixtures
- **Security:** Environment variables, API keys, RLS policies
- **Frontend:** Component structure, state management, accessibility
- **Backend:** API design, error handling, logging
- **Database:** Schema best practices, migrations

Before asking Claude Code to write code, make sure you understand these rules. Claude will follow them automatically.

## The Workflow

### Week 1–3 (MVP)
```
claude: Set up Supabase auth. Show me the schema you'd create.
claude: Write the Next.js auth middleware
claude: Implement the /api/items/upload endpoint
```

### Week 4–6 (Beta)
```
claude: Build the async job pipeline. I want jobs table, worker script, retry logic.
claude: Write tests for the Gemini extraction. Test both valid and invalid responses.
claude: Implement the job status polling on the frontend
```

### Week 7+ (Polish)
```
claude: Add structured logging to the job worker
claude: Generate test coverage report
claude: Review the entire lib/ folder for security issues
```

## Important: Don't Let Claude Make Decisions for You

Claude is a tool, not a replacement for your thinking. Always:

1. **Understand the output** — read every line Claude generates. If you don't understand it, ask.
2. **Review before committing** — even if Claude writes it, you approve it.
3. **Test it** — run `npm run dev`, test the feature, make sure it works.
4. **Think about tradeoffs** — when Claude offers multiple approaches, think about which fits your project.

## Examples

### Example 1: Ask Claude to implement a feature
```
claude: I need to add a "mark as sold" feature for items. When an item is marked sold, 
I should be able to track the price it sold for. Walk me through:
1. Database schema changes
2. API endpoint
3. Frontend component
```

Claude will ask clarifying questions and write the code.

### Example 2: Debug with Claude
```
claude: My job worker keeps crashing. Here's the error:
[paste full error log]

Here's the worker code:
[paste lib/workers/job-processor.ts]

Why is this happening?
```

Claude reads both and suggests the fix.

### Example 3: Code review
```
claude: Is this API route following best practices?
[paste app/api/items/route.ts]
```

Claude reviews it and suggests improvements.

## Prompt Engineering Tips

### Be specific
❌ "Help me with the database"
✅ "I need to add a `sold_price` column to the items table and update the API to accept it. Here's my current schema..."

### Give context
❌ "Why is this slow?"
✅ "This query is running on [X] items and taking [Y] ms. Here's the query... here's the schema..."

### Ask for explanation
✅ "Write this AND explain your design decisions"
✅ "Show me 2 approaches to this problem and compare them"

### Use code blocks
```
claude: Here's my current implementation:

```typescript
// your code
```

Can you improve it?
```

## .claude/ Directory Structure

Your project has a `.claude/` directory with:

```
.claude/
├── claude.json          # Claude Code configuration
├── rules/
│   ├── code-style.md    # TypeScript, naming, formatting
│   ├── testing.md       # Test structure, coverage targets
│   ├── security.md      # API keys, RLS, auth
│   ├── frontend.md      # React, components, state
│   ├── backend.md       # API design, error handling
│   └── database.md      # Supabase schema, migrations
├── context/
│   ├── ARCHITECTURE.md  # System design (fill in week 7)
│   └── DECISIONS.md     # Why we made certain choices
└── examples/
    ├── good-component.tsx
    ├── good-api-route.ts
    └── good-test.test.ts
```

Claude Code reads all of this automatically and uses it to guide responses.

## When NOT to Use Claude Code

- **Architectural decisions:** Think about these yourself, then ask Claude to implement
- **Business logic:** You decide the rules, Claude implements them
- **Security decisions:** You decide what's sensitive, Claude helps implement it safely
- **Product features:** You decide what the user needs, Claude helps build it

## Debugging Claude Code

If Claude's output doesn't match your rules:

1. Check that the rule file exists in `.claude/rules/`
2. Make sure the rule is specific (not too vague)
3. Paste the rule into your prompt: "Follow this rule: [rule text]"
4. Ask Claude: "Did you read .claude/rules/code-style.md?"

## Summer Milestones with Claude Code

| Week | Claude Code Usage |
|---|---|
| 1–2 | Set up auth, schema, basic endpoints |
| 3 | Implement Gemini integration |
| 4–5 | Build job pipeline, worker script |
| 6–7 | Tests, logging, error handling |
| 8–9 | Polish, edge cases, performance |
| 10+ | Bug fixes, refactoring |

## Pro Tips

1. **Use Claude Code for boilerplate** — auth setup, CRUD endpoints, schema migrations
2. **Use Claude Code for tests** — it's fast at generating comprehensive test suites
3. **Use Claude Code for debugging** — paste the error + code, it finds the issue
4. **Use Claude Code to learn** — ask "explain this pattern" and it will teach you

## When You're Stuck

If Claude Code gives you code you don't understand:

```
claude: I don't understand this part of your response:
[paste the confusing code]

Can you:
1. Explain it line by line
2. Show a simpler alternative
3. Tell me why you chose this approach
```

Claude will explain itself.

---

**Remember:** Claude Code is a speed multiplier, not a replacement for thinking. The better your questions, the better your code.

**Good luck building this summer.** 🚀
