"""
월간 리마인더 배치 — Render Cron Job으로 하루 1회 실행.
모든 device에 대해 이번 달 due 리마인더를 계산한다.
실제 발송(이메일/푸시)은 제공자 키가 필요하므로 여기선 로그 출력 스텁으로 둔다.
(이메일 연동 시: 환경변수로 SMTP 설정을 받아 smtplib로 발송하도록 확장.)

Render Cron 예: Command =  python send_reminders.py
"""
import os
from datetime import datetime, timezone
import storage
import remind

def this_month() -> str:
    d = datetime.now(timezone.utc)
    return f"{d.year}-{d.month:02d}"

def main():
    db = os.environ.get("MODU_DB", "modu.db")
    conn = storage.connect(db)
    storage.init_db(conn)
    today = this_month()
    total = 0
    for dev in storage.all_devices(conn):
        due = remind.compute_due(today, storage.list_ledger(conn, dev), storage.get_plan(conn, dev))
        if due:
            total += len(due)
            # 스텁: 실제로는 device→연락처 매핑 후 발송. 여기선 로그.
            print(f"[{today}] {dev[:8]}…: " + " / ".join(d["title"] for d in due))
    print(f"완료: {total}건의 리마인더 대상")

if __name__ == "__main__":
    main()
