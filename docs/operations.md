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

### GC-Inputs und Umgebungsvariablen

Die administrativen Inputs sind `mode`, `object`, `dry-run`, `grace-days`,
`untrusted-ttl-hours`, `expire-all-untrusted` und `delete-shared`. Die
Standardwerte sind `orphan`, kein Objekt, `dry-run: true`, `grace-days: 7`
und `untrusted-ttl-hours: 24`.

Bei einem direkten Aufruf des Bundles können die Werte über `GC_MODE`,
`GC_OBJECT`, `DRY_RUN`, `GRACE_DAYS`, `UNTRUSTED_TTL_HOURS`,
`GC_EXPIRE_ALL_UNTRUSTED` und `GC_DELETE_SHARED` gesetzt werden. Der geplante
Cleanup-Workflow verwendet insbesondere `UNTRUSTED_TTL_HOURS=24`; der
reguläre Zeitplan führt `expired` mit `DRY_RUN=false` aus. `delete-shared`
ist ausschließlich für einen ausdrücklich manuellen `expired`-Lauf zulässig.

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

## Betriebscheckliste

Vor dem produktiven Einsatz sollten folgende Punkte geprüft werden:

1. Das Cache-Repository besitzt ein angelegtes Manifest-Branch, üblicherweise
   `cache-data`, und das verwendete Token hat nur die erforderlichen Contents-
   Rechte.
2. `path` ist möglichst eng gewählt und enthält keine Secrets, Zugangsdaten,
   Produktionsdaten oder ausführbaren Build-Ausgaben, die ungeprüft verwendet
   werden könnten.
3. `scope: shared` wird nur für bewusst geprüfte Inhalte verwendet.
   Pull-Requests erhalten Shared-Restore nur mit
   `allow-shared-restore: true`.
4. `dry-run` bleibt bei manuellen GC-Läufen zunächst auf `true`. Vor einem
   echten Lauf werden `mode`, Ziel-Repository, TTL und erwartete Anzahl der
   Löschungen geprüft.
5. Für Restore und Save wird bei aktivierter Verschlüsselung exakt derselbe
   `encryption-key` verwendet. Dieser Schlüssel wird nie an Fork-Code
   weitergegeben.
6. Nach Änderungen an `src/` wird der vorgesehene Build-Workflow ausgeführt,
   damit `dist/` mit dem Quellcode übereinstimmt. `dist/` wird nicht manuell
   editiert.

### Verhalten bei Fehlern

Ohne `strict: true` behandelt Restore fehlende, beschädigte oder nicht
entschlüsselbare Cache-Objekte als Miss und lässt den Workflow weiterlaufen.
Mit `strict: true` wird derselbe Fehler an den Workflow weitergegeben. Save-
und Verwaltungsfehler werden als Step-Fehler gemeldet; ein teilweise
hochgeladenes, nicht referenziertes Objekt kann anschließend durch GC entfernt
werden.
