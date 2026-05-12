# Clearout AI Architecture

## System Diagram

User Browser
    ↓ (upload photo)
Next.js API Route
    ↓ (save photo + create job)
Supabase Database
    ↓ (job sits in queue)
Background Worker
    ↓ (fetch photo, call Gemini)
Gemini Vision API
    ↓ (return item data)
Database updated
    ↓ (job marked complete)
Frontend polls status
    ↓ (shows completed item)
User sees result

## Why Async?

If we called AI synchronously:
- User waits 1-5 seconds for each photo
- If API fails, request fails
- No retry mechanism

With async jobs:
- Item appears immediately
- AI processes in background
- Automatic retries if it fails
- User never sees loading screen

## Current Status

This file will be updated as you build the app. For now, refer to the rules 
in .claude/rules/ for implementation details.

Update this in Week 7 with diagrams and your learnings.
