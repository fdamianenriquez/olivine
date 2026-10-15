# Changesets

Every user-facing change needs a changeset. Run `pnpm changeset`, pick the bump
(while on `0.x`, breaking changes are a **minor** bump) and describe the change for the changelog.

Releases are cut by CI only: the release workflow opens a "Version Packages" pull request,
and merging it publishes to npm.
