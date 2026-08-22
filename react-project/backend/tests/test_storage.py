import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import storage, remind

def run():
    conn = storage.connect(":memory:")
    storage.init_db(conn)
    dev = "dev-abc"
    # upsert + list
    storage.upsert_ledger(conn, dev, "2026-08", 220, 8000)
    storage.upsert_ledger(conn, dev, "2026-08", 200, 8100)  # 덮어쓰기
    storage.upsert_ledger(conn, dev, "2026-09", 180, 8300)
    rows = storage.list_ledger(conn, dev)
    assert len(rows) == 2, rows
    assert rows[0]["saved"] == 200, rows[0]  # 덮어쓰기 반영
    # 다른 device 격리
    storage.upsert_ledger(conn, "other", "2026-08", 999, 1)
    assert len(storage.list_ledger(conn, dev)) == 2
    # bulk
    n = storage.bulk_upsert_ledger(conn, dev, [{"ym":"2026-10","saved":210,"nw":8600},{"ym":"2026-11","saved":215,"nw":8900}])
    assert n == 2 and len(storage.list_ledger(conn, dev)) == 4
    # delete
    assert storage.delete_ledger(conn, dev, "2026-11") is True
    assert storage.delete_ledger(conn, dev, "2099-01") is False
    assert len(storage.list_ledger(conn, dev)) == 3
    # plan
    storage.set_plan(conn, dev, 220, "2028-12")
    assert storage.get_plan(conn, dev) == {"savingMonthly":220,"anchorYm":"2028-12"}
    assert "other" in storage.all_devices(conn) and dev in storage.all_devices(conn)

    # remind: 이번달 기록 있음(2026-08) → LOG_THIS_MONTH 없어야
    led = storage.list_ledger(conn, dev)
    due = remind.compute_due("2026-08", led, storage.get_plan(conn, dev))
    codes = {d["code"] for d in due}
    assert "LOG_THIS_MONTH" not in codes, codes
    # 이번달 기록 없는 달로 보면 LOG_THIS_MONTH 떠야
    due2 = remind.compute_due("2027-01", led, storage.get_plan(conn, dev))
    assert "LOG_THIS_MONTH" in {d["code"] for d in due2}
    # 저조 케이스: 최근 3개월 저축 100(계획 220의 45%) → REPLAN
    conn2 = storage.connect(":memory:"); storage.init_db(conn2)
    for ym in ["2026-06","2026-07","2026-08"]: storage.upsert_ledger(conn2,"d",ym,100,5000)
    storage.set_plan(conn2,"d",220,"2028-12")
    dueR = remind.compute_due("2026-08", storage.list_ledger(conn2,"d"), storage.get_plan(conn2,"d"))
    assert "REPLAN" in {d["code"] for d in dueR}, dueR
    # 잔금 임박: today 2028-09, anchor 2028-12 → gap 3 → EXECUTION_SOON
    dueE = remind.compute_due("2028-09", storage.list_ledger(conn2,"d"), storage.get_plan(conn2,"d"))
    assert "EXECUTION_SOON" in {d["code"] for d in dueE}, dueE
    print("✓ storage + remind: 모든 단언 통과")

run()
