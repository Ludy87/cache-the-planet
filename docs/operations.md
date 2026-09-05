# Betrieb und Aufräumen

## Garbage Collection

`gc/action.yml` ist eine administrative Action für `orphan`, `expired`,
`object` und `all`. `dry-run` ist standardmäßig `true`; für Löschungen muss
`dry-run: false` ausdrücklich gesetzt werden. Sie darf nur in einem
vertrauenswürdigen Job mit minimalen `Contents`-Rechten laufen.

```yaml
- uses: Ludy87/cache-the-planet/gc@v1
  with:
    repository: Ludy87/cache-the-planet
    token: ${{ secrets.CACHE_APP_TOKEN }}
    mode: orphan
    dry-run: true
```

Der geplante Workflow `.github/workflows/cleanup.yml` entfernt abgelaufene
Untrusted-PR-Caches. Shared-Caches werden nur bei einer ausdrücklich
manuellen Freigabe einbezogen.

## PR-Cleanup

`pr-cleanup/action.yml` akzeptiert `repository`, `pr-repository` und
`pr-number`. Es entfernt ausschließlich den Namespace
`untrusted/<pr-repository>/pr-<pr-number>/` und danach nur nicht mehr
referenzierte Assets.

Der Workflow `.github/workflows/pr-cache-cleanup.yml` startet die Bereinigung
beim Event `pull_request: closed`.
