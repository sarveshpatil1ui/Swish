# 🚀 Swish Feature Implementation & QA Summary

This document outlines the bug fixes, schema migrations, and new features implemented for the core social features of Swish: **Posts, Comments, Likes, Follows, and Profiles**.

All features are now fully persistent in the MongoDB database and communicate seamlessly between the React frontend and Node.js backend.

---

## 📸 1. Posts & Image Uploading
**What was done:**
* **Schema Fix:** The frontend was attempting to send `caption` and `imageUrl`, but the backend Mongoose `Post` schema was strictly expecting `content` and `media`. I updated the `Post` schema to match the frontend expectations so posts could be created without errors.
* **Image Upload Pipeline:** Initially, picking an image in the "Create Post" modal did nothing but show a preview. I built out a complete Multer upload pipeline:
  * Added `uploadPostPhoto` middleware to process and validate image files.
  * Updated the `POST /api/posts` route to accept `multipart/form-data`.
  * Updated `apiCreatePost` in the frontend to transmit the binary `File` via `FormData`.
  * Images are now securely stored in `backend/uploads/posts/` and linked to the MongoDB document.

## 💬 2. Comments
**What was done:**
* **Comment Count Bug Fix:** Previously, when a user added a comment, the backend attempted to increment the post's comment count (`post.commentCount += 1`). However, `commentCount` was defined as a *virtual* field in Mongoose, meaning the increment was silently discarded and never saved to the database.
* **Resolution:** I refactored the `Post` schema to replace the virtual field with a concrete `Number` field (`default: 0`). Now, comment counts permanently save to the database and accurately reflect on the frontend.

## ❤️ 3. Likes
**What was done:**
* **Race-Condition Audit:** I audited the `POST /api/posts/:postId/like` endpoint. 
* **Validation:** Verified that the backend correctly uses MongoDB's atomic `$addToSet` operator. This prevents race conditions where rapid clicking could result in duplicate likes from the same user. Likes are fully persistent and instantly reflect on the feed.

## 👥 4. Follows
**What was done:**
* **Database Persistence:** Verified that `POST /api/users/:userId/follow` creates real `Follow` documents in MongoDB.
* **Count Synchronization:** Verified that following a user correctly and atomically increments the `following` count of the sender, and the `followers` count of the target.
* **UI Integration:** The Profile Page correctly queries this state to dynamically show whether the current user is following the profile being viewed.

## 👤 5. Profiles
**What was done:**
* **Crash Fix:** Fixed a critical frontend crash on `ProfilePage.jsx` where the code was attempting to read `post.user.id` on flattened post data, resulting in a blank screen. Changed the reference to `post.userId` to stabilize the page.
* **Dynamic Post Grid:** The profile page was previously using an empty placeholder array for the user's posts grid. I wired the grid up to the global Swish Context so that it dynamically filters and displays the actual posts created by the user you are viewing.

## 🔐 6. Password Recovery & Security (Forgot Password Flow)
**What was done:**
* **3-Step Secure Recovery Lifecycle:**
  1. **Request OTP (`POST /api/auth/forgot-password`):** Rate-limited per IP/email with constant-time dummy bcrypt hashing for non-existent users (prevents email enumeration). Issues a 6-digit OTP stored as a bcrypt hash with a 10-minute expiry.
  2. **Verify OTP (`POST /api/auth/verify-reset-otp`):** 5-attempt brute-force lockout, single-use OTP clearance, and issues a 10-minute SHA-256 hashed reset token.
  3. **Reset Password (`POST /api/auth/reset-password`):** Consumes single-use token, validates against previous password to prevent password reuse, updates `passwordChangedAt` timestamp, and invalidates all pre-existing JWT sessions via `auth.middleware.js`.
* **Branded Emails:** Responsive HTML and text transactional email templates using the Gmail API OAuth2 service for OTP codes and password change confirmation.
* **Frontend UI (`ForgotPasswordPage.jsx`):** Multi-step animated recovery flow with 6-digit auto-advancing OTP boxes, password strength visualizer matching `JoinPage`, and automated redirection with success banner to `/login`.

## 🔥 7. Trending & Discovery Hub
**What was done:**
* **Trending Algorithm & API (`/api/trending`):**
  * `GET /api/trending/posts`: Tab-filtered posts (`trending`, `foryou`, `college`) ranked via engagement score: `(likes + 3*comments + recentLikeBoost) / (ageHours + 2)^1.5` with cursor-based pagination.
  * `GET /api/trending/hashtags`: Aggregates active hashtags across campus posts with a 60-second in-memory cache.
  * `GET /api/trending/hashtags/:tag/posts`: Cursor-paginated posts matching a specific hashtag.
  * `GET /api/trending/accounts`: Suggested accounts based on mutual followers and popular campus creators.
* **Schema Optimizations & Indexes:** Added `likeCount`, `tags`, and `collegeId` fields with compound indexes on `Post` (`createdAt_tags`, `createdAt_likeCount`, `collegeId_createdAt`) for high-performance sorting.
* **Tag Extraction Pipeline:** Automatic `#hashtag` extraction and deduplication on post creation and updates (`normalizeTags`, `extractHashtags`).
* **Frontend UI (`TrendingPage.jsx`):** Instagram-style tile grid with hover overlays for like and comment counts, tab switches, interactive hashtag pills, and full-screen modal viewer (`PostViewerModal`). Accessible via navigation bar (`/trending`) and teaser card on Explore.

