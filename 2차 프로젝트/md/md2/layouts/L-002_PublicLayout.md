# L-002_PublicLayout.md (OpenAPI 기준 수정본)  

## 0. 목표

* 로그인 여부와 관계없이 접근 가능한 페이지의 공통 화면 구조를 정의한다.
* 인증 강제 없이도 사용자 상태에 따라 UI만 분기한다.
* 메인, 목록, 상세 페이지에서 동일한 레이아웃 규칙을 재사용한다.

---

## 1. 적용 범위

### 1.1 대상 페이지 (MVP)

* P-003_메인
* P-004_중고거래목록
* P-005_중고거래상세
* P-007_경매목록
* P-008_경매상세

### 1.2 인증 규칙

* 접근 유형: Public
* 로그인 여부는 UI 분기에만 사용한다.

---

## 2. 라우팅/구성 원칙

* Public 페이지는 PublicLayout 아래에서 렌더링된다.
* PublicLayout은 “공통 헤더 + 선택적 사용자 상태 표시”까지만 책임진다.
* 페이지별 비즈니스 로직(API 호출, 데이터 처리)은 각 페이지가 담당한다.

---

## 3. 화면 구성

### 3.1 레이아웃 구조(고정)

* 상단 공통 헤더(Header)
* 중앙 메인 컨텐츠 영역(Content)

구조:

* Header
* Content (children)

---

## 4. 공통 컴포넌트 정의

### 4.1 Header (필수)

포함 요소:

* 로고 / 서비스명 (클릭 시 `/`)
* 네비게이션 링크

  * 중고거래(`/posts`)
  * 경매(`/auctions`)
* 사용자 영역 (로그인 상태에 따라 분기)

동작:

* 로고 클릭 → `/`
* 중고거래 클릭 → `/posts`
* 경매 클릭 → `/auctions`

### 4.2 UserActionArea

로그인 상태 분기:

* 비로그인 상태:

  * 로그인 버튼 → `/login`
  * 회원가입 버튼 → `/signup`

* 로그인 상태:

  * 마이페이지 버튼 → `/mypage`
  * 채팅 버튼 → `/chat`

※ 로그아웃 버튼은 PublicLayout에 포함하지 않는다(ProtectedLayout 책임)

---

## 5. 데이터 모델(상태)

### 5.1 상태(State)

* me: {
  id: number
  username: string
  name: string
  score: number
  createDate: string
  modifyDate: string
  } | null
* isCheckingAuth: boolean

### 5.2 상태 소유 위치

* PublicLayout 로컬 상태
* 또는 상위 Provider에서 주입

---

## 6. API 연동

### 6.1 데이터 출처

* 도메인: 사용자/인증

### 6.2 사용 API

* (선택) GET /api/v1/members/me

  * 목적: 헤더 UI 분기용

※ 이 엔드포인트는 DTO를 직접 반환한다(RsData 래핑이 아님).

### 6.3 API 호출 전략

* 호출 시점:

  * PublicLayout 마운트 시 1회 (선택)
* 요청 조건:

  * credentials: include
* 성공 처리:

  * me 저장 → 헤더 UI를 로그인 상태로 분기
* 실패 처리:

  * me=null로 확정 → 비로그인 UI로 분기
* 실시간 처리:

  * 사용하지 않음
* 재호출:

  * 새로고침 시에만

---

## 7. UI/UX 규칙

### 7.1 인증 확인 중

* 헤더는 렌더링한다
* 사용자 영역은 placeholder 또는 숨김 처리

### 7.2 접근 제어

* PublicLayout에서는 리다이렉트 처리 없음
* Protected 페이지 이동 시 AUTH_GUARD.md 규칙에 따라 처리된다

---

## 8. 완료 조건 체크리스트

* [ ] Public 페이지는 모두 PublicLayout을 사용한다
* [ ] 로그인 여부에 따라 헤더 UI가 분기된다
* [ ] 인증 실패가 페이지 렌더링을 막지 않는다
* [ ] 로그아웃 책임이 ProtectedLayout에만 존재한다
