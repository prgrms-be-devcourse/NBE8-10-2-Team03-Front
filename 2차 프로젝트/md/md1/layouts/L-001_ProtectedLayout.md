# L-001 Protected 공통 레이아웃 (인증 필수 페이지 공통 뼈대)

## 0. 목표
- Protected 페이지(로그인 필수)의 공통 화면 구조를 정의한다.
- AUTH_GUARD.md 기준으로 인증 확인이 끝나기 전에는 페이지 렌더링을 차단한다.
- 모든 Protected 페이지가 동일한 UI/UX 규칙(헤더/네비/로그아웃/로딩/에러)을 재사용한다.

---

## 1. 적용 범위

### 1.1 대상 페이지 (MVP)
- P-006_중고거래작성
- P-009_경매작성
- P-010_채팅
- P-011_마이페이지

### 1.2 인증 규칙
- 접근 유형: Protected
- 인증 판정 및 리다이렉트 규칙은 AUTH_GUARD.md를 참조한다.

---

## 2. 라우팅/구성 원칙
- Protected 페이지는 반드시 ProtectedLayout 아래에서 렌더링된다.
- ProtectedLayout은 “공통 UI + 인증 게이트 + 공통 에러 처리”를 담당한다.
- 개별 페이지는 “본문 컨텐츠”만 책임진다.

---

## 3. 화면 구성

### 3.1 레이아웃 구조(고정)
- 상단 고정 헤더(Header)
- 좌측 사이드 네비게이션(SideNav) 또는 상단 탭(모바일 대응은 MVP에서 생략 가능)
- 중앙 메인 컨텐츠 영역(Content)
- 전역 토스트/알림 영역(선택, MVP는 ErrorMessage 영역으로 대체 가능)

권장 구조:
- Header (고정)
- Body
  - SideNav (선택)
  - Content (페이지별 children)

---

## 4. 공통 컴포넌트 정의

### 4.1 Header (필수)
포함 요소:
- 로고/서비스명(클릭 시 `/` 이동)
- 사용자 정보 요약 영역(닉네임/프로필 영역)
- 로그아웃 버튼

동작:
- 로고 클릭 → `/` 이동
- 로그아웃 클릭 → 로그아웃 API 호출 → 성공 시 `/login` 이동

### 4.2 SideNav (권장)
항목(예시):
- 마이페이지(`/mypage`)
- 채팅(`/chat`)
- 중고거래 목록(`/posts`)
- 경매 목록(`/auctions`)

동작:
- 현재 라우트 active 표시
- 클릭 시 해당 라우트로 이동

### 4.3 AuthGate (필수)
역할:
- Protected 페이지 진입 시 인증 상태를 확인한다.
- 인증 확인이 완료되기 전까지 children 렌더링을 막는다.

출력 상태:
- checkingAuth=true: 로딩 화면(스켈레톤/스피너)
- checkingAuth=false & authed=true: children 렌더
- checkingAuth=false & authed=false: `/login` 리다이렉트

### 4.4 GlobalError (필수)
역할:
- ProtectedLayout 레벨에서 공통 에러를 한 번에 처리한다.
- 네트워크 오류 또는 인증 확인 실패 시 표준 메시지 노출 후 규칙대로 이동한다.

---

## 5. 데이터 모델(상태)

### 5.1 전역 상태(ProtectedLayout 소유)
- authStatus: "checking" | "authed" | "guest"
- me: { id: number; email?: string; nickname?: string } | null
- globalErrorMessage: string | null

### 5.2 상태 소유 위치
- ProtectedLayout(또는 AuthProvider 같은 공통 Provider)
- 개별 페이지는 me를 읽기만 하고, 인증 판단 로직을 갖지 않는다.

---

## 6. API 연동

### 6.1 데이터 출처
- 도메인: 사용자/인증
- 담당자: 사용자·인증 담당

### 6.2 사용 API 목록(공통)
- GET /api/auth/me (로그인 상태 확인 및 사용자 정보 조회)
- POST /api/auth/logout (로그아웃)

※ 정확한 path/스펙은 API 명세서를 우선한다.

### 6.3 API 호출 전략 (새로고침 기반)
- 최초 호출 시점: ProtectedLayout 마운트 시 1회 `GET /api/auth/me`
- 재호출 트리거:
  - 새로고침
  - Protected 페이지 간 이동 시(레이아웃 유지라면 재호출하지 않음)
- 캐싱 여부: 없음 (단, 레이아웃 유지 시 메모리 상태 유지)
- 실시간 방식: 사용하지 않음

요청 공통 조건:
- credentials: include 필수
- 응답 포맷, 성공/실패 판정, 검증 에러 파싱 규칙은 CONTRACT_API.md를 따른다.

---

## 7. 권한 / 예외 / 에러 처리

### 7.1 인증 실패 처리
- `/api/auth/me` 실패 → authStatus="guest"로 확정
- 즉시 `/login`으로 리다이렉트 (AUTH_GUARD.md 규칙)

### 7.2 네트워크 오류 처리
- 기본: guest로 간주 + `/login` 이동
- 사용자에게는 공통 에러 메시지를 1회 노출 후 이동

### 7.3 로그아웃 처리
- 로그아웃 버튼 클릭 시 `POST /api/auth/logout`
- 성공 시:
  - 로컬 상태 초기화(me=null, authStatus="guest")
  - `/login` 이동
- 실패 시:
  - 에러 메시지 표시
  - 현재 화면 유지(단, 사용자 재시도 가능)

---

## 8. UI/UX 규칙(고정)

### 8.1 로딩(인증 확인 중)
- 페이지 컨텐츠 렌더링 금지
- Skeleton 또는 Spinner 표시
- Header는 표시 가능(단, 사용자 정보 영역은 placeholder)

### 8.2 에러 메시지
- 공통 에러 영역(GlobalError)에서 노출
- 상세 원인은 CONTRACT_API.md의 메시지 파싱 규칙을 따른다.

### 8.3 뒤로가기/리다이렉트
- guest가 Protected에 들어오면 `/login`으로 이동
- login 성공 후 원래 목적지로 되돌리기는 MVP에서 생략(기본값: `/`)

---

## 9. 완료 조건 체크리스트
- [ ] Protected 페이지는 모두 ProtectedLayout 아래에서 렌더링된다
- [ ] 진입 시 `/api/auth/me`로 인증 확인이 수행된다
- [ ] 인증 확인 전에는 children이 렌더링되지 않는다
- [ ] 비로그인 상태면 `/login`으로 이동한다
- [ ] 헤더에 로그아웃 버튼이 있고 동작한다
- [ ] 공통 에러 처리가 ProtectedLayout에서 일원화된다
- [ ] 페이지 MD는 인증 로직을 갖지 않고 접근 유형만 선언한다
