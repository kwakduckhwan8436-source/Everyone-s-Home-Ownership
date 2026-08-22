"""
모두의 내집마련 · 실적/리마인더 백엔드 (Render 배포용, FastAPI)

- 개인정보 없음. 식별자는 클라이언트가 만든 익명 device key(UUID) 하나. 헤더 X-Device-Key.
- 데이터 로직은 storage.py / remind.py(순수, 단독 테스트됨)에 있고, 여기선 얇게 노출만.

배포(Render):
  Environment:
    MODU_DB      = /var/data/modu.db     (Render Disk 마운트 경로 권장; 미설정 시 modu.db)
    ALLOW_ORIGIN = https://<아이디>.github.io   (선택, 기본 *)
  Start Command:
    uvicorn main:app --host 0.0.0.0 --port $PORT
  월간 리마인더는 Render Cron Job으로 send_reminders.py 를 하루 1회 실행(README 참조).
"""
import os
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import storage
import remind

DB_PATH = os.environ.get("MODU_DB", "modu.db")
ALLOW_ORIGIN = os.environ.get("ALLOW_ORIGIN", "*")

app = FastAPI(title="모두의 내집마련 · 실적/리마인더")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOW_ORIGIN] if ALLOW_ORIGIN != "*" else ["*"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    conn = storage.connect(DB_PATH)
    storage.init_db(conn)
    conn.close()

def conn():
    return storage.connect(DB_PATH)

def require_device(x_device_key: str | None) -> str:
    if not x_device_key or len(x_device_key) < 8:
        raise HTTPException(401, "X-Device-Key 헤더가 필요합니다.")
    return x_device_key

class LedgerIn(BaseModel):
    ym: str
    saved: float
    nw: float

class BulkIn(BaseModel):
    rows: list[LedgerIn]

class PlanIn(BaseModel):
    savingMonthly: float
    anchorYm: str

@app.get("/")
def health():
    return {"ok": True}

@app.get("/ledger")
def get_ledger(x_device_key: str | None = Header(default=None)):
    dev = require_device(x_device_key)
    c = conn()
    try:
        return {"rows": storage.list_ledger(c, dev)}
    finally:
        c.close()

@app.post("/ledger")
def post_ledger(body: LedgerIn, x_device_key: str | None = Header(default=None)):
    dev = require_device(x_device_key)
    c = conn()
    try:
        storage.upsert_ledger(c, dev, body.ym, body.saved, body.nw)
        return {"rows": storage.list_ledger(c, dev)}
    finally:
        c.close()

@app.post("/ledger/bulk")
def post_ledger_bulk(body: BulkIn, x_device_key: str | None = Header(default=None)):
    dev = require_device(x_device_key)
    c = conn()
    try:
        n = storage.bulk_upsert_ledger(c, dev, [r.model_dump() for r in body.rows])
        return {"upserted": n, "rows": storage.list_ledger(c, dev)}
    finally:
        c.close()

@app.delete("/ledger/{ym}")
def del_ledger(ym: str, x_device_key: str | None = Header(default=None)):
    dev = require_device(x_device_key)
    c = conn()
    try:
        return {"deleted": storage.delete_ledger(c, dev, ym)}
    finally:
        c.close()

@app.get("/plan")
def get_plan(x_device_key: str | None = Header(default=None)):
    dev = require_device(x_device_key)
    c = conn()
    try:
        return {"plan": storage.get_plan(c, dev)}
    finally:
        c.close()

@app.post("/plan")
def post_plan(body: PlanIn, x_device_key: str | None = Header(default=None)):
    dev = require_device(x_device_key)
    c = conn()
    try:
        storage.set_plan(c, dev, body.savingMonthly, body.anchorYm)
        return {"ok": True}
    finally:
        c.close()

@app.get("/reminders/due")
def reminders_due(today: str, x_device_key: str | None = Header(default=None)):
    dev = require_device(x_device_key)
    c = conn()
    try:
        return {"due": remind.compute_due(today, storage.list_ledger(c, dev), storage.get_plan(c, dev))}
    finally:
        c.close()
