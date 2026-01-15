# JP Typing Trainer

PC 키보드 전용 “일본어 로마자 타이핑” 웹앱 (단어 낙하 + 문장 따라치기). React + Vite + TypeScript 기반, 순수 CSS로 모던 UI를 구성했습니다.

## 실행 방법
- 의존성 설치: `npm install`
- 개발 서버: `npm run dev` 후 브라우저에서 안내된 로컬 주소 접속
- 프로덕션 빌드: `npm run build`
- 미니 테스트(로마자 매칭): `npm test`

## 주요 기능
- **단어 낙하형**: 난이도(1~10)별 속도/스폰 조절, 자동 타겟(가장 위험한 단어), 오답 무시 + 콤보/점수/타이머/라이프 관리.
- **문장 따라 입력**: 문장 구간 하이라이트, 후리가나 옵션, 정확도 중심 피드백.
- **로마자 매칭 엔진**: かな→복수 로마자 매핑, 촉음(っ), 요음, ん, 장음(ー) 처리, prefix 판정으로 입력 중단 없이 진행. 백스페이스 옵션.
- **키보드 가이드**: 예상 키 하이라이트(US 배열), 힌트 온/오프.
- **효과음**: Web Audio 기반 정답/오류/콤보/레벨업 비프음, 볼륨 & On/Off.
- **설정 & 저장**: localStorage에 설정/커스텀 데이터 저장, 다크/라이트, 난이도, 힌트, 키보드 가이드, 데이터 리셋.
- **데이터 관리**: 단어/문장 JSON import/export 버튼 제공(로컬만 사용, 서버 필요 없음).

## 폴더 구조
```
index.html
package.json
vite.config.ts
src/
  App.tsx                 # 상단 탭/테마/설정/데이터 import-export
  main.tsx
  styles.css              # 라이트/다크 테마, 카드 UI, 오버레이 등
  types.ts                # 공용 타입 정의
  data/
    words.ts              # 샘플 단어 데이터(표기/읽기/한국어/레벨/태그)
    sentences.ts          # 샘플 문장 데이터
  components/
    WordRainGame.tsx      # 단어 낙하 게임, RA 기반 루프/점수/콤보/라이프
    SentenceGame.tsx      # 문장 따라치기, 구간 진행/정확도
    SettingsModal.tsx     # 설정/난이도/효과음/데이터 리셋
    KeyboardOverlay.tsx   # 다음 키 하이라이트
    StatCard.tsx
  hooks/
    useLocalStorage.ts    # 설정/데이터 저장
    useAudio.ts           # Web Audio 비프음
  utils/
    romanizer.ts          # かな→로마자 복수 매칭 + incremental matcher
    romanizer.test.ts     # vitest 기반 간이 테스트
```

## 데이터 포맷 예시
- 단어: `{ "display": "病院", "reading": "びょういん", "ko": "병원", "level": 2, "tags": ["kanji"] }`
- 문장: `{ "text": "朝、小さな犬は公園へ行きました。", "reading": "あさ、ちいさないぬはこうえんへいきました。", "ko": "아침에 작은 강아지가 공원에 갔습니다.", "level": 1 }`

## 디자인/접근성
- 넉넉한 여백, 카드 레이아웃, 라운드 + 그림자, 라이트/다크 토글.
- 키보드 전용 포커스/아웃라인, 탭 이동 가능.
- 모달/오버레이로 설정·결과 표시, 애니메이션은 과하지 않게 적용.
