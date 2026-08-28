# Vercel 배포 설정

## 1. 프로젝트 연결
Vercel → Add New → Project → `donghyun0215/marketingbot` import.
Framework는 Next.js로 자동 인식된다. Build/Output 설정은 손대지 않는다.

## 2. 환경변수 (Settings → Environment Variables)
Production / Preview / Development 모두 체크.

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cqgpttzkaveiimeulfwq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret 키 ← **NEXT_PUBLIC_ 붙이지 말 것** |
| `LLM_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | AI Studio 키 |
| `GEMINI_MODEL` | `gemini-3.6-flash` |
| `TELEGRAM_BOT_TOKEN` | BotFather 토큰 |
| `TELEGRAM_CHAT_ID` | `1281048247` |
| `TELEGRAM_WEBHOOK_SECRET` | 아무 무작위 문자열 (아래 3번에서 동일하게 사용) |

`SUPABASE_SERVICE_ROLE_KEY`에 `NEXT_PUBLIC_` 접두사를 붙이면 브라우저 번들에 키가 그대로 들어가
누구나 DB 전체를 읽고 쓸 수 있게 된다.

## 3. 텔레그램 웹훅 등록
배포 URL이 나온 뒤 한 번만 실행한다. `<>` 안은 실제 값으로 바꾼다.

```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<배포도메인>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message", "callback_query"]
  }'
```

확인:
```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```
`"pending_update_count": 0` 이고 `last_error_message`가 없으면 정상이다.

## 4. 배포 후 동작 확인
1. 대시보드 접속 → 승인 대기 1건, 귀속률 40%, 인사이트가 보이면 DB 연결 정상
2. 텔레그램에서 ✅ 승인 → "승인 완료" 메시지가 오면 웹훅 정상
3. ❌ 반려 → 사유 입력 → 대시보드 "시스템이 배운 규칙"에 그 문장이 나타나면 루프 2 확인

## 참고
- Vercel Hobby(무료)로 충분하다. 서버리스 함수 실행시간 제한이 있으므로
  긴 생성 작업은 백그라운드로 빼거나 스크립트로 돌린다.
- 데일리 브리핑 자동화는 Vercel Cron으로 붙일 수 있다 (`vercel.json`의 `crons`).
  데모에서는 스크립트 수동 실행으로 충분하다.
