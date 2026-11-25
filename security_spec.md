# Music chill Firestore Security Specification

## 1. Data Invariants
1. **Identity Isolation**: Users may only read and write their own `users/{userId}`, `users/{userId}/private/{docId}`, `users/{userId}/sync/{syncDocId}`, and `users/{userId}/activity/{activityId}` documents. Raw PII (`email`) is strictly isolated in `users/{userId}/private/info`.
2. **Verified Auth Gate**: All writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Immutable Ownership & Timestamps**: `uid`, `ownerId`, `authorId`, and `createdAt` cannot be modified after creation. `createdAt == request.time` on create; `updatedAt == request.time` on update.
4. **Playlist Ownership**: Only `ownerId == request.auth.uid` can create, edit, or delete a `playlists/{playlistId}` document. Non-owners can only read playlists where `isPublic == true`.
5. **Social Hub Integrity**: Only `authorId == request.auth.uid` can create or delete a `sharedPosts/{postId}` document. Initial `likesCount` must be `0` and `savesCount` must be `0` on creation.
6. **Atomic Likes**: A `sharedPosts/{postId}/likes/{userId}` document can only be created or deleted by `userId == request.auth.uid` when `sharedPosts/{postId}.likesCount` is atomically incremented/decremented by `1` in the same batch (`getAfter`).
7. **Bounded Arrays & Strings**: `trackIds` and `favoriteTrackIds` and `queueTrackIds` are strictly bounded (`<= 100` items), and every string/ID field has strict `.size()` and regex checks.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Profile Create**: `{ uid, displayName, handle, ..., role: "admin" }` -> Rejected by `keys().hasOnly(...)`.
2. **Identity Spoofing on Playlist Create**: `{ ownerId: "victim-uid", ... }` signed in as attacker -> Rejected by `ownerId == request.auth.uid`.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` creating a playlist -> Rejected by `isVerifiedUser()`.
4. **Cross-User PII Read**: Attacker reading `users/victim/private/info` -> Rejected by `isOwner(userId)`.
5. **Blanket List Query Scraping**: Querying `/playlists` without filtering `isPublic == true` or `ownerId == request.auth.uid` -> Rejected by `allow list` checking `resource.data`.
6. **Backdated Timestamp**: Creating an activity entry with `createdAt: "2020-01-01T00:00:00Z"` instead of `serverTimestamp()` -> Rejected by `createdAt == request.time`.
7. **ID Poisoning**: Creating `/playlists/aaaa...200chars` or `/playlists/bad$id` -> Rejected by `isValidId()`.
8. **Unbounded Array Exhaustion**: Creating a playlist with 500 `trackIds` -> Rejected by `trackIds.size() <= 100`.
9. **Inflated Initial Likes**: Creating a `sharedPosts` doc with `likesCount: 9999` -> Rejected by `likesCount == 0`.
10. **Non-Atomic Like Spam**: Creating `sharedPosts/{id}/likes/{uid}` without incrementing `likesCount` on parent -> Rejected by `getAfter(...)`.
11. **Immutable Owner Tampering**: Updating a playlist's `ownerId` or `createdAt` -> Rejected by immutability checks and `affectedKeys().hasOnly(...)`.
12. **Comment Injection on Non-Existent Post**: Creating a comment under a bogus `postId` -> Rejected by `exists(/databases/$(database)/documents/sharedPosts/$(postId))`.
