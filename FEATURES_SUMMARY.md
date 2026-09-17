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
