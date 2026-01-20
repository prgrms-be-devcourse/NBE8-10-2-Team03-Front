# ROUTES

본 문서는 **각 페이지 MD의 `## 1. 라우트(페이지)`** 에서 추출한 라우트의 집계본이다.
`app/` 디렉토리, `middleware.ts`, layout 적용은 **본 문서를 기준으로만** 생성한다.

## Public (공개 페이지)

- /auctions
- /auctions/[id]
- /posts
- /posts/[id]

## Guest Only (비로그인 전용)

- /login
- /signup

## Protected (로그인 필수)

- /
- /auctions/write
- /chat
- /mypage
- /posts/write

## 출처 매핑

| Route | Sources(MD) |
|------|-------------|
| / | `pages\P-003_메인.md` |
| /auctions | `pages\P-007_경매목록.md` |
| /auctions/[id] | `pages\P-008_경매상세.md` |
| /auctions/write | `pages\P-009_경매작성.md` |
| /chat | `pages\P-010_채팅.md` |
| /login | `pages\P-001_로그인.md` |
| /mypage | `pages\P-011_마이페이지.md` |
| /posts | `pages\P-004_중고거래목록.md` |
| /posts/[id] | `pages\P-005_중고거래상세.md` |
| /posts/write | `pages\P-006_중고거래작성.md` |
| /signup | `pages\P-002_회원가입.md` |
