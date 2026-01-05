# ConstructionPro Android (Kotlin + Jetpack Compose)

This folder bootstraps a native Android app for the ConstructionPro backend.

## Quick start
- Open this folder in Android Studio.
- Let Android Studio configure the SDK and sync Gradle.
- Run the app on an emulator or device.

## API
- Debug uses `http://10.0.2.2:3000/api/` (Android emulator loopback).
- Release uses `https://constructionpro.vercel.app/api/`.
- `android:usesCleartextTraffic="true"` is enabled for local HTTP testing.

## Supabase config
Set these values in `construction-android/gradle.properties` (or your global Gradle properties):
- `SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
- `SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`

## Auth
- The app signs in with Supabase email/password.
- It stores the access token and sends it as a Bearer token to the backend.
- Users must already exist in the backend database (created via the web app).

## Screens
- Projects list (GET `/api/projects`)
- Project detail (GET `/api/projects/[id]`)
- Daily logs list (GET `/api/daily-logs?projectId=...`)
- Daily log detail (GET `/api/daily-logs/[id]`)
- Daily log create (POST `/api/daily-logs`)
- Daily log edit (PUT `/api/daily-logs/[id]`)
- Project edit (PATCH `/api/projects/[id]`) for admins (includes assignments)
- Profile (GET `/api/users/me`)

## UX
- Server-side search + pagination for Projects and Daily Logs.
- Daily log date is captured from the device date.
- Weather is captured via device location and `/api/weather`.
- Optional photo uploads attach to daily logs via `/api/upload`.
- Location permission is required for weather capture and photo GPS tagging.
