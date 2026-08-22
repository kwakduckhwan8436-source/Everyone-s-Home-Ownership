"""
순수 리마인더 로직 — 저장소에서 읽은 plain dict만 받아 계산. DB/네트워크 의존 없음 → 단독 테스트.
"""
def months_between(a: str, b: str) -> int:
    ya, ma = map(int, a.split("-")); yb, mb = map(int, b.split("-"))
    return (yb - ya) * 12 + (mb - ma)

def compute_due(today_ym: str, ledger_rows: list[dict], plan: dict | None) -> list[dict]:
    due = []
    yms = {r["ym"] for r in ledger_rows}

    # 1) 이번 달 기록 누락
    if today_ym not in yms:
        due.append({"code": "LOG_THIS_MONTH", "severity": "info",
                    "title": "이번 달 실적 기록하기",
                    "detail": "실제 저축액과 순자산을 넣으면 계획선과의 차이를 추적할 수 있습니다."})

    # 2) 최근 3개월 달성률 저조
    if plan and plan.get("savingMonthly"):
        recent = sorted(ledger_rows, key=lambda r: r["ym"])[-3:]
        if len(recent) >= 3:
            avg = sum(r["saved"] for r in recent) / len(recent)
            if avg < plan["savingMonthly"] * 0.8:
                due.append({"code": "REPLAN", "severity": "warn",
                            "title": "목표 재조정 검토",
                            "detail": "최근 3개월 저축이 계획의 80% 미만입니다. 자책이 아니라 목표시점·목표가를 현실에 맞추세요."})

    # 3) 잔금월 임박 / 도달
    if plan and plan.get("anchorYm"):
        gap = months_between(today_ym, plan["anchorYm"])
        if 0 < gap <= 4:
            due.append({"code": "EXECUTION_SOON", "severity": "warn",
                        "title": f"실행기 임박 (D-{gap}개월)",
                        "detail": "계약금 확보와 대출 사전심사를 서두르세요. 전세 만기·잔금일 정렬을 확인하세요."})
        elif gap <= 0:
            due.append({"code": "SETTLEMENT", "severity": "info",
                        "title": "잔금월 도달",
                        "detail": "소유권이전등기와 취득세 신고(60일 내)를 확인하세요."})
    return due
