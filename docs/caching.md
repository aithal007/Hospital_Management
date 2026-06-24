# Caching Strategy & Redis Configurations

This document outlines the distributed caching architecture and invalidation patterns implemented in Phase 3 of the CareFlow Hospital Management System.

---

## 1. Doctor Availability Cache

* **Key Format**: `doctor:availability:{doctorId}:{date}`
* **Type**: `String` (JSON Array of Appointments)
* **TTL**: `60 seconds` (1 minute)
* **Purpose**: Prevents repeated database lookups for schedule checking when verifying potential booking overlaps.
* **Write/Read Strategy**:
  - **Cache Miss**: Queries all non-cancelled appointments for a doctor on a given date from the database, stores the array in Redis, and filters the slots in-memory.
  - **Cache Hit**: Fetches the complete daily scheduled array from Redis and resolves overlaps instantly in-memory.
* **Invalidation Trigger**:
  - Automatically deleted (`DEL`) when a new appointment is created for that doctor on that date.
  - Automatically deleted (`DEL`) when an appointment's status is changed (approved, completed, or cancelled).

---

## 2. Doctor Profile Details Cache

* **Key Format**: `doctor:details:{id}`
* **Type**: `String` (JSON Object)
* **TTL**: `300 seconds` (5 minutes)
* **Purpose**: Offloads heavy user-joined doctor profile queries when loading specialization lists, search results, or profile detail cards.
* **Write/Read Strategy**:
  - **Cache Miss**: Performs an inner-join query across `doctors` and `users` tables, serializes and caches the single profile result.
  - **Cache Hit**: Directly serves the serialized profile object.
* **Invalidation Trigger**:
  - Automatically deleted (`DEL`) when a doctor profile is updated on the server.

---

## 3. JWT Blacklist for Stateless Revocation

* **Key Format**: `blacklist:{token}`
* **Type**: `String` (Flag `'1'`)
* **TTL**: `Dynamic` (Calculated as `exp - current_time_seconds`)
* **Purpose**: Ensures instant server-side revocation on user logout.
* **Write/Read Strategy**:
  - **On Logout**: Decodes the token to read its `exp` claim, calculates remaining valid duration, and flags it in Redis.
  - **On Authenticate**: The auth middleware checks for this key in Redis. If it exists, the request is immediately rejected with `401 Unauthorized`.
* **Invalidation Trigger**:
  - Self-cleans naturally upon Redis expiration of the dynamic TTL.

---

## 4. Popular Doctors leaderboard

* **Key**: `doctors:views`
* **Type**: `Sorted Set (ZSET)`
* **TTL**: `Persistent`
* **Purpose**: Tracks real-time analytical doctor popularity rankings.
* **Write/Read Strategy**:
  - **On View**: Every successful `GET /doctors/:id` request increments the doctor's score in the sorted set using `ZINCRBY`.
  - **Featured Retrieval**: Fetches the top 5 highest-scored doctor IDs using `ZREVRANGE`, then resolves their details from the database.
