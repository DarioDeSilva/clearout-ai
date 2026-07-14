# Claude Code Setup Guide — Learning First

This document explains how to use Claude Code **as a learning tool**. Your primary goal this summer is not just to ship code, but to deeply understand every line you write.

## Core Philosophy

**You are learning to be a better engineer, not just shipping a product.**

Every time Claude generates code for you:
1. You will read every line
2. Claude will explain every line
3. You will understand the *why* before moving on
4. You will modify it to match your style
5. Only then do you commit it

This is harder than just copy-pasting, but it's the only way to actually learn.

## How to Use Claude Code for Learning

### Request Format: Always Ask for Explanation

❌ **Don't do this:**
```
claude: Implement the Gemini extraction endpoint
```

✅ **Do this:**
```
claude: Implement the Gemini extraction endpoint. 
For every function, explain:
1. What it does
2. Why we structured it this way
3. Any edge cases I should know about
4. How it connects to the rest of the system

Then walk me through the code line by line.
```

### Line-by-Line Walkthrough

After Claude generates code, always ask:

```
claude: Now explain this line by line. I want to understand:
- What does each line do?
- Why did you write it that way?
- What would break if I removed this line?
- How does this line connect to the previous one?
```

Claude will annotate the code:

```typescript
// CREATE THE SUPABASE CLIENT
// This is a server-side client that uses the service role key
// (not the anon key). Service role has admin privileges and can
// bypass RLS policies if needed.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// FETCH THE JOB FROM THE DATABASE
// We use .single() because we expect exactly one result.
// If the job doesn't exist, it throws an error (which is good —
// we want to know if we're trying to process a job that doesn't exist).
const { data: job, error } = await supabase
  .from('jobs')
  .select('*')
  .eq('id', jobId)
  .single()
```

### Learning Questions to Ask

```
claude: I don't understand this part:
[paste the confusing code]

Can you:
1. Explain what problem this solves
2. Show me an example of what breaks if we don't do this
3. Teach me the underlying concept (is this TypeScript? A pattern? An API?)
4. Show me an alternative way to write this and explain the tradeoffs
```

### When You Get Stuck

```
claude: I'm confused about async/await. I see it used in [code], 
but I don't understand why we need it here. Can you:
1. Explain what async/await does
2. Show what would happen if we removed the "await"
3. Teach me when to use async vs regular functions
4. Apply this understanding to the code above
```

## What Claude Should ALWAYS Do

When Claude writes code for you, it should include:

✅ **Comments explaining the why, not the what**
```typescript
// Good comment — explains why
// We use a service role key here (not anon key) because we need to
// bypass RLS to cleanup expired jobs as an admin operation

// Bad comment — restates the code
// Create a Supabase client
const supabase = createClient(...)
```

✅ **Line-by-line explanations when you ask**

✅ **Edge cases and error handling** — with explanation of why each is needed

✅ **References to your rules** — "This follows code-style.md by using explicit error types"

✅ **Comparisons to alternatives** — "We could use X, but we use Y because..."

✅ **Teaching the underlying concept** — not just the syntax

❌ **Never:** Just paste code without explanation
❌ **Never:** Assume you understand TypeScript/async/database concepts
❌ **Never:** Skip the "why" and jump to the "what"

## Learning Milestones by Week

### Week 1–2: Foundations
You should understand:
- TypeScript types and interfaces (what they do, why they matter)
- How Supabase Auth works
- How Next.js API routes receive and return data
- What `async/await` does and when to use it

Ask Claude:
```
claude: Before we code, teach me about TypeScript interfaces. 
What are they? Why do we use them? Show me 3 examples.
```

### Week 3–4: AI Integration
You should understand:
- How Gemini Vision API works
- What JSON schema validation is and why it matters
- How to structure errors from external APIs
- What "structured output" means

Ask Claude:
```
claude: Teach me about Zod schema validation. What problem does it solve? 
Why can't we just use JSON.parse()? 
Show me an example of validation catching a real bug.
```

### Week 5–6: Async Architecture
You should understand:
- Why we can't just call AI inside a request (blocking)
- How job queues work
- What retry logic is and why it's necessary
- What idempotency means

Ask Claude:
```
claude: Explain the job queue pattern. Why is this better than 
just calling the AI synchronously? Walk me through what happens 
when the AI fails and we retry.
```

### Week 7+: Deep Dives
You should understand:
- How RLS (Row Level Security) prevents users from seeing each other's data
- How database indexing works and when we need it
- What N+1 queries are and why they're slow
- How to debug production issues

Ask Claude:
```
claude: I want to really understand RLS. Create a scenario where 
RLS stops a security breach, then explain exactly how. 
Show me the SQL, the API code, and what would break without RLS.
```

## The Learning Commit Message

When you commit code Claude helped you write, your commit message should show you understand it:

✅ **Good commit messages:**
```
feat: implement async job pipeline for image extraction

- Jobs are created immediately when user uploads photo
- Worker fetches image and calls Gemini Vision API
- Results update item record, UI polls for completion
- Retries with exponential backoff on API failures

This pattern prevents blocking the user's request on slow AI processing.
```

❌ **Bad commit messages:**
```
feat: add job processing
chore: implement stuff
wip: claude helped me with this
```

Your commit message is proof you understand the code.

## Red Flags (Stop and Learn)

If Claude generates code and you:
- Can't explain it back to someone
- Don't understand why a line exists
- Just copied it because it looked right
- Can't modify it if requirements change

**Then stop. Don't commit. Ask Claude to explain.**

```
claude: I can't explain this part to myself. 
Please break it down into smaller pieces and explain each one.
```

## Projects You'll Understand Deeply

By the end of summer, you should be able to:

**Frontend (React/TypeScript):**
- Write a component from scratch and explain every hook
- Debug state management issues
- Understand when to use useState vs Context
- Know what re-rendering is and why it matters

**Backend (Next.js API routes):**
- Write an API endpoint that validates input, checks auth, and returns errors
- Understand what happens when your code throws an error
- Debug a slow database query
- Know what the difference is between GET, POST, PATCH, DELETE

**Database (Supabase/PostgreSQL):**
- Write a schema that makes sense
- Understand why RLS matters (personally, not just "security is important")
- Know what an index is and when to use it
- Debug an N+1 query

**AI Integration (Gemini Vision):**
- Understand what the AI can and can't do
- Know how to validate its output
- Handle failures gracefully
- Know when to retry vs give up

**Async Patterns (Job Queue):**
- Understand why we don't block on AI calls
- Know how retries work
- Debug a job that's stuck
- Know what idempotency is

## Template: How to Ask Claude for Code

Here's the template you should use every time:

```
claude: I need to [feature].

Here's what I want to happen:
1. [step 1]
2. [step 2]
3. [step 3]

Here's my constraint:
- Use [technology] because [reason]
- Follow [rule file] for code style
- Make sure [security concern] is handled

Please:
1. Show me the code
2. Explain each function's purpose
3. Walk me through the code line by line
4. Tell me what could go wrong and how we prevent it
5. Show me how to test this
6. Explain any concepts I might not know (like [concept])
```

## When to Code Without Claude

Some things you should code yourself, even if Claude offers to help:

- **The Go HTTP server project** — you write every line
- **Unit tests** — write the test first, then show Claude
- **Debugging your own errors** — try for 15 minutes first, then ask Claude
- **Refactoring your code** — do it yourself first, then ask Claude to review

## The Goal

By August, you should be able to:

1. **Explain your entire codebase** — every major system, why it exists, how it works
2. **Write new features without Claude** — Claude helps you go faster, but you could do it alone
3. **Debug production issues** — you understand the code deep enough to know what's wrong
4. **Teach someone else** — you could explain async jobs, RLS, and AI integration to a junior engineer

That's how you know you've learned it.

## Prompting Rules for Learning

### Rule 1: Ask for Explanation First
```
Before showing me code, explain the approach. Why this solution?
What are the alternatives? What are the tradeoffs?
```

### Rule 2: Ask for Analogies
```
I don't understand async/await. What's an analogy?
```

### Rule 3: Ask "Why Not?"
```
Why don't we just fetch all items at once instead of paginating?
What would break?
```

### Rule 4: Ask for Walkthroughs
```
Walk me through what happens when a user uploads a photo, 
from the moment they click the button to the item appearing on the dashboard.
```

### Rule 5: Ask for Comparisons
```
We could use [X] or [Y]. Which one should we use and why?
Show me code for both and compare.
```

## Proof You're Learning

Here's how to know you're actually learning:

- [ ] You can explain your code to someone without looking at it
- [ ] You can predict what will break if you remove a line
- [ ] You understand the error messages when things go wrong
- [ ] You can modify Claude's code to fit your needs
- [ ] You disagree with some of Claude's suggestions and can articulate why
- [ ] You could build the next feature without Claude's help
- [ ] You can teach someone else how the async pipeline works
- [ ] You understand RLS deeply enough to find a security hole

If you can't do these things, keep asking questions.

## Summer Learning Arc

**May:** Foundation — understand the tech stack pieces individually
**June:** Integration — understand how the pieces fit together
**July:** Mastery — understand the whole system and could build it again from scratch
**August:** Teaching — you could explain it all to a junior engineer

Claude is your tutor, not your code generator.

---

**Remember:** The code doesn't matter. Understanding matters. Take your time. Ask questions. Don't move on until you get it.
