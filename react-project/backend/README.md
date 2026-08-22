# 모두의 내집마련 · 백엔드 (실적 저장 + 월간 리마인더)

선택 사항입니다. 프론트는 백엔드 없이도 로컬(localStorage)로 완전 동작합니다.
백엔드를 붙이면 기기 간 백업/복원과 월간 리마인더가 가능합니다.

## 설계

- **개인정보 없음.** 식별자는 클라이언트가 만든 익명 device key(UUID) 하나. 헤더 `X-Device-Key`.
- **순수 코어 / 얇은 껍데기.** 데이터·리마인더 로직은 `storage.py`·`remind.py`(stdlib만, 단독 테스트),
  `main.py`는 FastAPI 노출만.

## 로컬 실행

```bash
pip install -r requirements.txt
uvicorn main:app --reload
python tests/test_storage.py   # 순수 레이어 테스트 (stdlib만)
```

## Render 배포

```
Environment:
  MODU_DB      = /var/data/modu.db          # Render Disk 마운트 경로 권장(영속). 미설정 시 modu.db
  ALLOW_ORIGIN = https://<아이디>.github.io   # 선택, 기본 *
Start Command:
  uvicorn main:app --host 0.0.0.0 --port $PORT
```

프론트 '실적 추적' 탭 → 서버 동기화 URL 칸에 `https://<서비스>.onrender.com` 입력 →
"서버에 백업" / "서버에서 불러오기".

## 월간 리마인더 (Render Cron Job)

`send_reminders.py` 를 하루 1회 실행하도록 Cron Job 등록:

```
Command:  python send_reminders.py
Schedule: 0 0 * * *
```

이번 달 기준 각 기기의 due 리마인더(기록 누락 / 달성률 저조 / 잔금 임박 등)를 계산합니다.
실제 발송(이메일·푸시)은 제공자 키가 필요하므로 현재는 로그 스텁이며, SMTP 등으로 확장하세요.

## 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/` | 헬스체크 |
| GET | `/ledger` | 이 기기의 실적 목록 |
| POST | `/ledger` | 실적 1건 upsert `{ym,saved,nw}` |
| POST | `/ledger/bulk` | 실적 일괄 upsert `{rows:[...]}` |
| DELETE | `/ledger/{ym}` | 실적 삭제 |
| GET | `/plan` | 계획(월저축·잔금월) 조회 |
| POST | `/plan` | 계획 저장 `{savingMonthly,anchorYm}` |
| GET | `/reminders/due?today=YYYY-MM` | 이번 달 리마인더 |

모든 요청에 `X-Device-Key` 헤더 필요.
