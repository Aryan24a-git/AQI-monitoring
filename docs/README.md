# Documentation index

The repository root [README](../README.md) is the user-facing project introduction and quickstart.

- [Architecture](./ARCHITECTURE.md) — implemented UI, domain, server, and provider boundaries.
- [API](./API.md) — current route contracts and limits.
- [Catalog](./CATALOG.md) and [Evidence](./EVIDENCE.md) — action catalog and source notes.
- [Domain](./DOMAIN.md) — domain concepts and safety rules; verify numeric tables against the current implementation before reusing them.
- [Requirements](./REQUIREMENTS.md) and [Traceability](./TRACEABILITY.md) — planning and requirement mapping; status fields may be historical and are not a release attestation.
- [Security](./SECURITY.md) and [Security audit](./SECURITY_AUDIT.md) — controls and review limits.
- [Testing](./TESTING.md) — commands that exist in `package.json`.
- [Accessibility](./ACCESSIBILITY.md) — automated coverage and manual checklist.
- [Deployment](./DEPLOYMENT.md) and [Runbook](./RUNBOOK.md) — deployment configuration and operational caveats.
- [Evaluation pack](../EVALUATION_PACK.md) — current judging-criteria evidence and unverified items.
- [Release notes](./RELEASE_NOTES.md) — historical snapshot; it contains outdated framework, provider, and audit claims and should not be used as current evidence.

The `evidence/` folder contains older generated snapshots and explicit supersession notices. Use the evaluation pack and current CI/local command output for the submitted commit; do not treat an undated snapshot as current verification.
