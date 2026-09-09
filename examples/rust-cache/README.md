# Rust-/Cargo-Cache-Beispiel

`dtolnay/rust-toolchain` installiert nur die Rust-Toolchain. Der Cargo-Download-
und Git-Cache wird mit `CARGO_HOME` nach `.cache/cargo` umgeleitet und über
`cache-the-planet` gespeichert. Das Rust-`target`-Verzeichnis wird bewusst nicht
gecached, weil es vom Compiler, Betriebssystem und Runner abhängig ist.
