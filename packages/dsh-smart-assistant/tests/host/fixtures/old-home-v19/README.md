# Frozen old-home fixture (v19-era)

This is a sanitized, frozen snapshot of the two plugin-owned data directories as a v19-era home
looked. It exists so a compatibility test can boot **current code** against **old bytes** and read
every surface back: the synthetic `upgrade-smoke` predecessor proves the install/remove boundary,
not that old records still parse.

- No real user data, no host paths, no secrets.
- The manual is a v19 generated manual with the retired answer-contract paragraph, so the test
  also proves the manual migration chain runs on a real file shape. It is stored as
  `AGENTS.md.fixture` and copied to `AGENTS.md` by the test: a literal `AGENTS.md` under the repo
  would be loaded as developer instructions by the harness while tests are authored.
- Do not refresh it from a live home. A new generation gets a new `old-home-vN` directory and a
  new test case; changing this one destroys the only old-bytes evidence.
