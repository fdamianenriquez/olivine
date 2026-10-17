# Next.js smoke test

A minimal App Router app that server-renders every Olivine component and then hydrates it. CI
builds it against the packed tarball of the library, so it checks what consumers install, not
the source. It is not published.

```sh
pnpm ssr:prepare   # build the library, pack it, install it here and build the app
pnpm ssr           # run the checks in tests/ssr against `next start`
```
