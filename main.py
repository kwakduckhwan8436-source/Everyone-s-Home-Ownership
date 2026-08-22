"""
모두의 내집마련 · 백엔드 프록시 (Render 배포용, 단일 파일 FastAPI)

역할:
  1) /explain  — AI 해설 프록시 (Anthropic 키는 서버 환경변수에만)
  2) /realprice — 국토교통부 아파트 매매 실거래가 (공공데이터포털, 무료 API) 서버측 조회
       · 브라우저 직접 호출은 CORS로 막히므로 이 서버가 대신 호출·파싱해 JSON으로 돌려준다.
       · 실거래가 인증키(무료)는 서버 환경변수(MOLIT_SERVICE_KEY)에만 둔다.

배포(Render) 환경변수:
  ANTHROPIC_API_KEY = sk-ant-...            (AI 해설용, 선택)
  MODEL             = claude-haiku-4-5-...  (선택)
  ALLOW_ORIGIN      = https://<id>.github.io (선택, 기본 *)
  MOLIT_SERVICE_KEY = <공공데이터포털 '아파트 매매 실거래가' 무료 인증키(Decoding 키)>
Start Command:  uvicorn main:app --host 0.0.0.0 --port $PORT

무료 인증키 발급: data.go.kr → '국토교통부_아파트 매매 실거래가 자료'(15126469) → 활용신청(자동승인)
법정동코드(LAWD_CD, 앞 5자리): 행정표준코드관리시스템 code.go.kr → '법정동코드 전체자료'
"""
import os
import statistics

def _pct(sorted_vals, q):
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    idx = q * (len(sorted_vals) - 1)
    lo = int(idx)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = idx - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


def _dist(vals):
    if not vals:
        return {"minMan": None, "maxMan": None, "p25Man": None, "p75Man": None,
                "outlierLow": 0, "outlierHigh": 0, "outlierCount": 0,
                "fenceLowMan": None, "fenceHighMan": None}
    sv = sorted(vals)
    p25 = _pct(sv, 0.25)
    p75 = _pct(sv, 0.75)
    iqr = p75 - p25
    lo_f = p25 - 1.5 * iqr
    hi_f = p75 + 1.5 * iqr
    low = sum(1 for v in sv if v < lo_f)
    high = sum(1 for v in sv if v > hi_f)
    return {"minMan": round(sv[0]), "maxMan": round(sv[-1]),
            "p25Man": round(p25), "p75Man": round(p75),
            "outlierLow": low, "outlierHigh": high, "outlierCount": low + high,
            "fenceLowMan": round(lo_f), "fenceHighMan": round(hi_f)}


def _pyeong_vals(deals):
    out = []
    for d in deals:
        try:
            a = float(d.get("areaM2"))
            amt = d.get("amountMan")
            if a and a > 0 and amt:
                out.append(amt / (a / 3.3058))
        except (TypeError, ValueError):
            continue
    return out


def _pyeong_range(pyv):
    d = _dist(pyv)
    return {"pyeongMinMan": d["minMan"], "pyeongMaxMan": d["maxMan"],
            "pyeongP25Man": d["p25Man"], "pyeongP75Man": d["p75Man"],
            "pyeongOutlierLow": d["outlierLow"], "pyeongOutlierHigh": d["outlierHigh"],
            "pyeongOutlierCount": d["outlierCount"], "pyeongCount": len(pyv)}



import re
import json
import urllib.request
import urllib.parse
import datetime
import xml.etree.ElementTree as ET
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import anthropic

MODEL = os.environ.get("MODEL", "claude-haiku-4-5-20251001")
ALLOW_ORIGIN = os.environ.get("ALLOW_ORIGIN", "*")

# 국토교통부 아파트 매매 실거래가(일반자료) — 검증된 공식 엔드포인트
MOLIT_URL = "http://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade"

app = FastAPI(title="모두의 내집마련 · 백엔드 프록시")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOW_ORIGIN] if ALLOW_ORIGIN != "*" else ["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ===== 회원 등급별 접속키(선택) =====
# ACCESS_KEYS 환경변수 형식:  코드1:premium,코드2:basic,코드3:premium
#   - 미설정(빈 값)이면 게이트 OFF (모두 허용, 하위호환)
def _parse_access_keys():
    raw = os.environ.get("ACCESS_KEYS", "").strip()
    m = {}
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" in part:
            code, tier = part.split(":", 1)
            m[code.strip()] = tier.strip() or "basic"
        else:
            m[part] = "basic"
    return m

def _access_tier(key):
    """key의 등급 반환. ACCESS_KEYS 미설정이면 항상 'premium'(게이트 OFF)."""
    keys = _parse_access_keys()
    if not keys:
        return "premium"  # 게이트 미설정 = 제한 없음
    if not key:
        return None
    return keys.get(key.strip())

def _require_key(key):
    """ACCESS_KEYS가 설정돼 있으면 유효한 키를 요구. 아니면 통과."""
    keys = _parse_access_keys()
    if not keys:
        return  # 게이트 OFF
    if not key or key.strip() not in keys:
        raise HTTPException(403, "유효한 접속 코드가 필요합니다 (AI재테크연구소 회원 전용).")


_client = None
def client():
    global _client
    if _client is None:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            raise HTTPException(500, "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다.")
        _client = anthropic.Anthropic(api_key=key)
    return _client


class ExplainReq(BaseModel):
    system: str
    data: dict


def allowed_numbers(obj) -> set:
    s = json.dumps(obj, ensure_ascii=False)
    return {tok.rstrip(".") for tok in re.findall(r"\d[\d.]*", s)}


def find_flagged(text: str, allowed: set) -> list:
    found = {tok.replace(",", "").rstrip(".") for tok in re.findall(r"\d[\d,]*\.?\d*", text)}
    return sorted(n for n in found if len(n) > 1 and n not in allowed)


@app.get("/verify")
def verify(key: str = ""):
    """접속 코드 검증 → 등급 반환. 프론트 게이트에서 사용."""
    tier = _access_tier(key)
    gated = bool(_parse_access_keys())
    return {"valid": tier is not None, "tier": tier, "gated": gated}

@app.get("/health")
def health():
    return {"ok": True, "model": MODEL, "realprice": bool(os.environ.get("MOLIT_SERVICE_KEY")), "gated": bool(_parse_access_keys())}

@app.get("/", response_class=HTMLResponse)
def home():
    """index.html(앱)이 있으면 화면을 보여주고, 없으면 상태 JSON."""
    here = os.path.dirname(os.path.abspath(__file__))
    for name in ("index.html", "app-standalone-offline.html"):
        fp = os.path.join(here, name)
        if os.path.exists(fp):
            try:
                with open(fp, encoding="utf-8") as f:
                    return HTMLResponse(f.read())
            except Exception:
                pass
    return JSONResponse({"ok": True, "model": MODEL, "realprice": bool(os.environ.get("MOLIT_SERVICE_KEY")), "gated": bool(_parse_access_keys())})


@app.post("/explain")
def explain(req: ExplainReq):
    allowed = allowed_numbers(req.data)
    user = "ENGINE_RESULT:\n" + json.dumps(req.data, ensure_ascii=False, indent=2)
    try:
        msg = client().messages.create(
            model=MODEL, max_tokens=700, system=req.system,
            messages=[{"role": "user", "content": user}],
        )
    except anthropic.APIError as e:
        raise HTTPException(502, f"Anthropic 호출 실패: {e}")
    text = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
    flagged = find_flagged(text, allowed)
    return {"text": text, "flagged": flagged, "guard_passed": len(flagged) == 0, "model": MODEL}


def _txt(item, tag: str) -> str:
    el = item.find(tag)
    return el.text.strip() if el is not None and el.text else ""


@app.get("/realprice")
def realprice(lawd_cd: str, deal_ymd: str, rows: int = 40, area_min: float = 0.0, area_max: float = 0.0, apt_query: str = "", floor_min: int = 0, floor_max: int = 0, key: str = ""):
    _require_key(key)
    """국토교통부 아파트 매매 실거래가 (공공데이터포털, 무료).
    lawd_cd: 법정동코드 앞 5자리(예 11110=서울 종로구), deal_ymd: 계약년월 YYYYMM(예 202608)."""
    key = os.environ.get("MOLIT_SERVICE_KEY")
    if not key:
        raise HTTPException(500, "서버에 MOLIT_SERVICE_KEY(공공데이터포털 실거래가 무료 인증키)가 없습니다.")
    if not (len(lawd_cd) == 5 and lawd_cd.isdigit()):
        raise HTTPException(400, "lawd_cd는 법정동코드 앞 5자리 숫자여야 합니다 (예: 11110).")
    if not (len(deal_ymd) == 6 and deal_ymd.isdigit()):
        raise HTTPException(400, "deal_ymd는 계약년월 6자리여야 합니다 (예: 202608).")
    rows = max(1, min(rows, 1000))
    qs = urllib.parse.urlencode({
        "serviceKey": key, "LAWD_CD": lawd_cd, "DEAL_YMD": deal_ymd,
        "numOfRows": rows, "pageNo": 1,
    })
    url = f"{MOLIT_URL}?{qs}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
    except Exception as e:
        raise HTTPException(502, f"실거래가 API 호출 실패: {e}")
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        raise HTTPException(502, f"응답 XML 파싱 실패: {e}")
    code_el = root.find(".//resultCode")
    if code_el is not None and code_el.text and code_el.text not in ("000", "00"):
        msg_el = root.find(".//resultMsg")
        raise HTTPException(502, f"API 오류 {code_el.text}: {msg_el.text if msg_el is not None else ''}")
    deals = []
    for item in root.findall(".//item"):
        amount_raw = _txt(item, "거래금액").replace(",", "")
        try:
            amount_man = int(amount_raw)
        except ValueError:
            amount_man = None
        y, m, d = _txt(item, "년"), _txt(item, "월"), _txt(item, "일")
        deals.append({
            "apt": _txt(item, "아파트"),
            "amountMan": amount_man,           # 거래금액(만원)
            "areaM2": _txt(item, "전용면적"),
            "floor": _txt(item, "층"),
            "buildYear": _txt(item, "건축년도"),
            "dong": _txt(item, "법정동"),
            "date": f"{y}-{m.zfill(2)}-{d.zfill(2)}" if y else "",
        })
    if area_min > 0 or area_max > 0 or apt_query or floor_min > 0 or floor_max > 0:
        aq = apt_query.strip().lower()
        def _keep(d):
            if area_min > 0 or area_max > 0:
                try:
                    a = float(d["areaM2"])
                except (TypeError, ValueError):
                    return False
                if area_min > 0 and a < area_min:
                    return False
                if area_max > 0 and a >= area_max:
                    return False
            if aq and aq not in (d.get("apt") or "").lower():
                return False
            if floor_min > 0 or floor_max > 0:
                try:
                    fl = int(d["floor"])
                except (TypeError, ValueError):
                    return False
                if floor_min > 0 and fl < floor_min:
                    return False
                if floor_max > 0 and fl > floor_max:
                    return False
            return True
        deals = [d for d in deals if _keep(d)]
    vals = [x["amountMan"] for x in deals if x["amountMan"]]
    avg = round(sum(vals) / len(vals)) if vals else None
    median = round(statistics.median(vals)) if vals else None
    return {"count": len(deals), "avgMan": avg, "medianMan": median, "deals": deals,
            "lawdCd": lawd_cd, "dealYmd": deal_ymd,
            "areaMin": area_min, "areaMax": area_max, **_dist(vals),
            "medianPyeongMan": (round(statistics.median(_pyeong_vals(deals))) if _pyeong_vals(deals) else None),
            **_pyeong_range(_pyeong_vals(deals))}


def _prev_ym(ym: str, k: int) -> str:
    y, m = int(ym[:4]), int(ym[4:])
    m -= k
    while m <= 0:
        m += 12
        y -= 1
    return f"{y:04d}{m:02d}"


@app.get("/realprice_avg")
def realprice_avg(lawd_cd: str, months: int = 3, base_ymd: str = "", area_min: float = 0.0, area_max: float = 0.0, apt_query: str = "", floor_min: int = 0, floor_max: int = 0, key: str = ""):
    _require_key(key)
    """최근 N개월(기본 3, 신고지연 감안해 지난달부터) 아파트 매매 실거래가 평균.
    lawd_cd: 법정동코드 앞 5자리. base_ymd 미지정 시 '지난달'부터 거슬러 N개월."""
    key = os.environ.get("MOLIT_SERVICE_KEY")
    if not key:
        raise HTTPException(500, "서버에 MOLIT_SERVICE_KEY(공공데이터포털 실거래가 무료 인증키)가 없습니다.")
    if not (len(lawd_cd) == 5 and lawd_cd.isdigit()):
        raise HTTPException(400, "lawd_cd는 법정동코드 앞 5자리 숫자여야 합니다 (예: 11110).")
    months = max(1, min(months, 12))
    if len(base_ymd) == 6 and base_ymd.isdigit():
        base = base_ymd
    else:
        base = _prev_ym(datetime.datetime.now().strftime("%Y%m"), 1)  # 지난달(신고지연 감안)
    all_vals = []
    all_pyeong = []
    per_month = []
    for k in range(months):
        ym = _prev_ym(base, k)
        try:
            data = realprice(lawd_cd, ym, rows=1000, area_min=area_min, area_max=area_max, apt_query=apt_query, floor_min=floor_min, floor_max=floor_max, key=key)
            vals = [x["amountMan"] for x in data["deals"] if x["amountMan"]]
            pyv = _pyeong_vals(data["deals"])
        except HTTPException:
            vals = []
            pyv = []
        per_month.append({"ym": ym, "count": len(vals),
                          "avgMan": round(sum(vals) / len(vals)) if vals else None,
                          "pyeongMan": round(statistics.median(pyv)) if pyv else None})
        all_vals += vals
        all_pyeong += pyv
    avg = round(sum(all_vals) / len(all_vals)) if all_vals else None
    median = round(statistics.median(all_vals)) if all_vals else None
    return {"lawdCd": lawd_cd, "months": months, "baseYmd": base,
            "count": len(all_vals), "avgMan": avg, "medianMan": median, "perMonth": per_month,
            "areaMin": area_min, "areaMax": area_max, **_dist(all_vals),
            "medianPyeongMan": (round(statistics.median(all_pyeong)) if all_pyeong else None),
            **_pyeong_range(all_pyeong)}


_STATS = {"total": 0, "days": {}}

@app.post("/stats")
def stats():
    """방문 누적/오늘 집계 (인메모리; 영구 보관은 파일/DB 권장)."""
    from datetime import date
    _STATS["total"] += 1
    d = str(date.today())
    _STATS["days"][d] = _STATS["days"].get(d, 0) + 1
    return {"total": _STATS["total"], "today": _STATS["days"][d]}
