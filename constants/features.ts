/**
 * Work board (job posts, talent profiles/CVs) and quote-based Hire projects are discontinued
 * (Quy chế 2.1, 05/10/2026) and replaced by fixed-package professional services. Existing
 * contracts and hire projects stay reachable by direct link so they can finish; the API answers
 * 410 for new activity. Keep in sync with web `src/app/models/feature-flags.ts`.
 */
export const WORK_BOARD_ENABLED = false;

/** Quote + milestone flow for professional services. Off: they are bought from the wallet like any product. */
export const HIRE_QUOTE_FLOW_ENABLED = false;
