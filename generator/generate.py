#!/usr/bin/env python3
"""Wichtel-Generator.

Liest generator/teilnehmer.json, lost die Wichtelpartner zufällig aus und
erstellt pro Person eine eigene Seite unter wichtel/<zufallscode>.html.

Der Name des Wichtelpartners steht NICHT im Klartext in der Seite, sondern ist
verschlüsselt. Der Schlüssel steckt nur im persönlichen Link (hinter dem "#").
Ohne den kompletten Link kann man die Seite also nicht "aufdecken" – auch nicht
über den Quelltext oder das Git-Repo.

Die Zuordnung wird nirgendwo gespeichert oder ausgegeben. Ausgegeben werden nur
die Links (Name -> Link), die du an die jeweilige Person schickst.

Aufruf:  python3 generator/generate.py
"""

import base64
import hashlib
import html
import json
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "generator" / "teilnehmer.json"
TEMPLATE = ROOT / "generator" / "vorlage.html"
OUT_DIR = ROOT / "wichtel"
LINKS_FILE = ROOT / "generator" / "links.txt"  # in .gitignore

MAGIC = "WICHTEL:"


def keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    out = b""
    counter = 0
    while len(out) < length:
        out += hashlib.sha256(key + nonce + counter.to_bytes(4, "big")).digest()
        counter += 1
    return out[:length]


def encrypt(name: str, key: bytes) -> tuple[str, str]:
    nonce = secrets.token_bytes(12)
    plain = (MAGIC + name).encode("utf-8")
    ks = keystream(key, nonce, len(plain))
    cipher = bytes(a ^ b for a, b in zip(plain, ks))
    return base64.b64encode(nonce).decode(), base64.b64encode(cipher).decode()


def draw(names: list[str], blocked: set[frozenset]) -> dict[str, str]:
    """Zufällige Zuordnung: niemand zieht sich selbst oder eine Ausnahme."""
    rng = secrets.SystemRandom()
    for _ in range(100_000):
        receivers = names[:]
        rng.shuffle(receivers)
        ok = all(
            g != r and frozenset((g, r)) not in blocked
            for g, r in zip(names, receivers)
        )
        if ok:
            return dict(zip(names, receivers))
    raise SystemExit("Keine gültige Auslosung möglich – zu viele Ausnahmen?")


def main() -> None:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    names = [n.strip() for n in cfg["teilnehmer"] if n.strip()]
    if len(set(names)) != len(names):
        raise SystemExit("Jeder Name darf nur einmal vorkommen.")
    if len(names) < 3:
        raise SystemExit("Bitte mindestens 3 Teilnehmer eintragen.")

    blocked = set()
    for pair in cfg.get("ausnahmen", []):
        unknown = [p for p in pair if p not in names]
        if unknown:
            raise SystemExit(f"Unbekannter Name in 'ausnahmen': {unknown}")
        blocked.add(frozenset(pair))

    assignment = draw(names, blocked)

    template = TEMPLATE.read_text(encoding="utf-8")
    base_url = cfg.get("basis_url", "").rstrip("/") + "/"
    budget = cfg.get("budget", "").strip()
    datum = cfg.get("datum", "").strip()

    infos = []
    if datum:
        infos.append(f'<li><span aria-hidden="true">📅</span> Bescherung: <strong>{html.escape(datum)}</strong></li>')
    if budget:
        infos.append(f'<li><span aria-hidden="true">💶</span> Budget: <strong>{html.escape(budget)}</strong></li>')
    infos.append('<li><span aria-hidden="true">🤫</span> Pssst – nicht verraten, wen du hast!</li>')

    # Alte Seiten entfernen, damit keine veralteten Links übrig bleiben
    OUT_DIR.mkdir(exist_ok=True)
    for old in OUT_DIR.glob("*.html"):
        old.unlink()

    lines = []
    for giver in names:
        token = secrets.token_urlsafe(9)
        key = secrets.token_bytes(16)
        nonce_b64, cipher_b64 = encrypt(assignment[giver], key)
        page = (
            template.replace("{{BASE}}", html.escape(base_url))
            .replace("{{GIVER}}", html.escape(giver))
            .replace("{{GIVER_JS}}", json.dumps(giver))
            .replace("{{NONCE}}", nonce_b64)
            .replace("{{CIPHER}}", cipher_b64)
            .replace("{{INFOS}}", "\n          ".join(infos))
        )
        (OUT_DIR / f"{token}.html").write_text(page, encoding="utf-8")
        key_b64 = base64.urlsafe_b64encode(key).decode().rstrip("=")
        lines.append(f"{giver}: {base_url}wichtel/{token}.html#{key_b64}")

    del assignment  # Zuordnung wird nirgends gespeichert

    LINKS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("🎄 Fertig! Schicke jeder Person NUR ihren eigenen Link:\n")
    print("\n".join(lines))
    print(f"\n(Die Links stehen auch in {LINKS_FILE.relative_to(ROOT)} – diese Datei wird nicht committet.)")


if __name__ == "__main__":
    main()
