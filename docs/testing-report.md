
# Testing Report

## MSIT 5910-01 Capstone Project: Zero Trust Architecture for SMEs


## Overview

This report summarizes the unit testing completed for the JWT Authentication system built as part of the MSIT 5910-01 capstone project. The goal of testing was to verify that all authentication, token management, and security enforcement behaviors work correctly across both the backend and frontend layers of the system.


## Testing Framework

The project uses Jest as the primary testing framework, with Supertest for backend HTTP endpoint testing. Tests are split across two files.

- backend/backend.test.js covers the Node.js/Express backend
- client/client.test.js covers the Vite vanilla JavaScript frontend


## Results Summary

| Category | Tests | Status |
|----------|-------|--------|
| Backend | 8 | All Passing |
| Frontend | 16 | All Passing |
| Total | 24 | All Passing |


## Test Types Covered

**Happy Path** tests confirm that the system works correctly under normal conditions. This includes a valid JWT granting access to the protected endpoint and a successful login returning a token.

**Negative** tests confirm that the system correctly rejects invalid or unauthorized requests. This includes expired tokens, missing tokens, and invalid signatures being denied access.

**Boundary** tests confirm that the system behaves correctly at the edges of defined limits. This includes tokens expiring at exactly the 5-minute mark and the inactivity timer triggering at exactly 60 minutes.

**State** tests confirm that the system manages token state correctly across user actions. This includes token storage after login, token removal after logout, and token replacement after a refresh.

**Structural** tests confirm that the system components are set up correctly. This includes verifying that the JWT middleware is attached to the protected endpoint and that the correct environment variables are loaded.


## Key Behaviors Verified

The backend JWT middleware correctly validates RS256 signed tokens issued by Authentik. The protected endpoint at GET /secure-data returns a 401 Unauthorized response when no token or an invalid token is presented. Token refresh works automatically when 1 minute of validity remains and manually via a user-triggered button. The inactivity auto-logout triggers after 60 minutes of no activity, with a 5-minute warning banner displayed before logout occurs. Logout correctly clears all tokens from the frontend and redirects the user home.


## Known Issue Resolved

The jwks-rsa library has an ES module incompatibility with Jest. This was resolved by mocking the JWT middleware during testing so that the core logic could be tested independently without requiring a live connection to Authentik.