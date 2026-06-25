# ADR-0006: Match listings with AI, with a human review queue

- Status: Accepted
- Date: 2026-06-24

## Context

Secondhand listings are free text written by people, like "used baby sleeper, works great". Deciding which recall, if any, a listing matches is fuzzy. Two failure modes matter: auto-blocking on a wrong match frustrates honest sellers, and missing a real match lets a dangerous product through.

## Decision

Use Claude to map a listing to the most likely recall and return a confidence score. High-confidence matches flow through automatically. Low-confidence matches go to a human review queue rather than being auto-blocked. A heuristic fallback covers the case where the model is unavailable.

## Consequences

- The system favors correctness: uncertain cases are reviewed, not guessed.
- A review step exists and needs to be staffed as volume grows.
- The model is configurable through an environment variable, so it can be tuned for cost or accuracy.
