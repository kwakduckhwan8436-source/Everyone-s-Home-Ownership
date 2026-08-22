"""
순수 데이터 레이어 (stdlib sqlite3만 사용) — FastAPI와 분리되어 단독 테스트 가능.
개인정보 없음: 식별자는 클라이언트가 생성한 익명 device key(UUID) 하나뿐.
"""
import sqlite3
from datetime import datetime, timezone
from typing import Optional

def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def connect(db_path: str = "modu.db") -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS ledger (
          device TEXT NOT NULL,
          ym     TEXT NOT NULL,
          saved  REAL NOT NULL,
          nw     REAL NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (device, ym)
        );
        CREATE TABLE IF NOT EXISTS plan (
          device TEXT PRIMARY KEY,
          saving_monthly REAL NOT NULL,
          anchor_ym TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        """
    )
    conn.commit()

# ---- ledger ----
def upsert_ledger(conn, device: str, ym: str, saved: float, nw: float) -> None:
    conn.execute(
        """INSERT INTO ledger(device, ym, saved, nw, updated_at) VALUES(?,?,?,?,?)
           ON CONFLICT(device, ym) DO UPDATE SET saved=excluded.saved, nw=excluded.nw, updated_at=excluded.updated_at""",
        (device, ym, float(saved), float(nw), _now()),
    )
    conn.commit()

def bulk_upsert_ledger(conn, device: str, rows: list[dict]) -> int:
    for r in rows:
        upsert_ledger(conn, device, r["ym"], r.get("saved", 0), r.get("nw", 0))
    return len(rows)

def list_ledger(conn, device: str) -> list[dict]:
    cur = conn.execute("SELECT ym, saved, nw FROM ledger WHERE device=? ORDER BY ym", (device,))
    return [{"ym": r["ym"], "saved": r["saved"], "nw": r["nw"]} for r in cur.fetchall()]

def delete_ledger(conn, device: str, ym: str) -> bool:
    cur = conn.execute("DELETE FROM ledger WHERE device=? AND ym=?", (device, ym))
    conn.commit()
    return cur.rowcount > 0

# ---- plan ----
def set_plan(conn, device: str, saving_monthly: float, anchor_ym: str) -> None:
    conn.execute(
        """INSERT INTO plan(device, saving_monthly, anchor_ym, updated_at) VALUES(?,?,?,?)
           ON CONFLICT(device) DO UPDATE SET saving_monthly=excluded.saving_monthly, anchor_ym=excluded.anchor_ym, updated_at=excluded.updated_at""",
        (device, float(saving_monthly), anchor_ym, _now()),
    )
    conn.commit()

def get_plan(conn, device: str) -> Optional[dict]:
    cur = conn.execute("SELECT saving_monthly, anchor_ym FROM plan WHERE device=?", (device,))
    r = cur.fetchone()
    return {"savingMonthly": r["saving_monthly"], "anchorYm": r["anchor_ym"]} if r else None

def all_devices(conn) -> list[str]:
    cur = conn.execute("SELECT DISTINCT device FROM ledger UNION SELECT DISTINCT device FROM plan")
    return [r[0] for r in cur.fetchall()]
