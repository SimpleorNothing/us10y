# CLAUDE.md - us10y 작업 규칙

## 브랜치/배포
- 항상 claude/init-samsungda-repo-shgrq 에서 분기한 새 브랜치에서 작업하고, PR base 는 반드시 claude/init-samsungda-repo-shgrq 로 한다.
- 기본 브랜치에 직접 커밋/직접 push 금지. 변경은 **새 브랜치 + PR 로만** 한다.
- 작업 후 "PR 생성 링크"만 주지 말고, gh pr create 로 PR을 직접 연다:
  `gh pr create --base claude/init-samsungda-repo-shgrq --head <작업브랜치> --fill`

## 파일
- public/index.html : 사이트 본문. 전체 재작성보다 부분 수정 우선, 편집 후 파일 크기가 비정상적으로 줄지 않았는지 확인.
- data.json : 시계열 데이터. 편집 시 유효한 JSON 을 유지한다.
- package.json : 유효한 JSON 을 유지한다.

## PR
- PR 제목/본문에 무엇을 왜 바꿨는지 한국어로 요약한다.
