# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ImmoYield, please **do not** open a
public GitHub issue. Instead, email **security@immoyield.com** (or the project
owner) with:

- A description of the issue
- Steps to reproduce
- The impact you believe it has
- Any proof-of-concept code (optional)

We will acknowledge your report within 3 business days and aim to provide a
status update within 10 business days.

## Supported Versions

Only the `main` branch (production deployment) receives security fixes.

## Scope

In scope:
- The deployed application at the production domain
- Authentication, authorization, and data-isolation issues
- Server-side code in this repository

Out of scope:
- Third-party services (Supabase, Vercel, ScraperAPI) — report directly to them
- Social engineering, physical attacks, denial-of-service
- Issues requiring physical access to a user's device

## Safe Harbor

We will not pursue legal action against researchers who:
- Make a good-faith effort to avoid privacy violations and service disruption
- Do not access, modify, or delete data belonging to other users
- Report issues privately before public disclosure
