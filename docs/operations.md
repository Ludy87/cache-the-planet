# Betrieb und Aufräumen

## Garbage Collection

`gc/action.yml` ist eine administrative Action für `orphan`, `expired`,
`object` und `all`. `dry-run` ist standardmäßig `true`; für Löschungen muss
`dry-run: false` ausdrücklich gesetzt werden. Sie darf nur in einem
vertrauenswürdigen Job mit minimalen `Contents`-Rechten laufen.

Die Modi haben folgende Bedeutung:

- `orphan`: entfernt Assets, die nicht mehr referenziert und älter als
  `grace-days` sind. Standardmäßig beträgt die Grace-Period sieben Tage.
- `expired`: entfernt abgelaufene Untrusted-PR-Referenzen. Standardmäßig gilt
  eine Lebensdauer von 24 Stunden (`untrusted-ttl-hours`).
- `object`: entfernt genau das mit `object` angegebene Objekt, sofern es nicht
  mehr referenziert ist.
- `all`: entfernt alle Manifest-Referenzen und anschließend nicht mehr
  referenzierte Assets. Dieser Modus ist besonders destruktiv und sollte nur
  für einen ausdrücklich geplanten Verwaltungsjob verwendet werden.

`expire-all-untrusted` darf nur bewusst gesetzt werden, wenn alle Untrusted-
Referenzen ablaufen sollen. Shared-Referenzen werden durch `expired` nicht
entfernt, außer `delete-shared: true` wird in einem manuellen `expired`-Lauf
gesetzt. Der reguläre Zeitplan verwendet diese Option nicht.

```yaml
- uses: Ludy87/cache-the-planet/gc@v1
  with:
    repository: Ludy87/cache-the-planet
    token: ${{ secrets.CACHE_APP_TOKEN }}
    mode: orphan
    dry-run: true
```

Die Action stellt `mode`, `dry-run`, `deleted-assets` und
`removed-references` als Outputs bereit. `object` erwartet im gleichnamigen
Modus entweder den vollständigen `sha256:<64-hex>`-Hash oder den
Asset-Dateinamen.

Der geplante Workflow `.github/workflows/cleanup.yml` entfernt abgelaufene
Untrusted-PR-Caches. Shared-Caches werden nur bei einer ausdrücklich
manuellen Freigabe einbezogen.

## PR-Cleanup

`pr-cleanup/action.yml` akzeptiert `repository`, `pr-repository` und
`pr-number`. Es entfernt ausschließlich den Namespace
`untrusted/<pr-repository>/pr-<pr-number>/` und danach nur nicht mehr
referenzierte Assets. Die Action stellt `removed-references` und
`deleted-assets` als Outputs bereit. `pr-repository` bezeichnet dabei das
Repository, in dem die Pull Request geöffnet wurde; `repository` ist das
Cache-Repository.

Der Workflow `.github/workflows/pr-cache-cleanup.yml` startet die Bereinigung
beim Event `pull_request: closed`.
