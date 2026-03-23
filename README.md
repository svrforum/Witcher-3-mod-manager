# Witcher 3 Mod Manager

<p align="center">
  <strong>위쳐 3: 와일드 헌트 모드를 쉽게 설치하고 관리할 수 있는 Windows 데스크톱 앱</strong>
</p>

<p align="center">
  <a href="https://github.com/svrforum/Witcher-3-mod-manager/releases/latest">
    <img src="https://img.shields.io/github/v/release/svrforum/Witcher-3-mod-manager?style=flat-square&color=c4a135" alt="Latest Release">
  </a>
  <a href="https://github.com/svrforum/Witcher-3-mod-manager/releases">
    <img src="https://img.shields.io/github/downloads/svrforum/Witcher-3-mod-manager/total?style=flat-square&color=333" alt="Downloads">
  </a>
  <a href="https://github.com/svrforum/Witcher-3-mod-manager/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/svrforum/Witcher-3-mod-manager?style=flat-square&color=333" alt="License">
  </a>
</p>

---

Nexus Mods에서 다운받은 모드 파일(.zip, .rar)을 클릭 한번으로 설치하고, 활성화/비활성화, 로드 순서 변경, 스크립트 충돌 병합까지 한 곳에서 관리할 수 있습니다. 커뮤니티 추천 모드 목록도 기본 제공되어 처음 모드를 접하는 분도 쉽게 시작할 수 있습니다.

**[최신 버전 다운로드](https://github.com/svrforum/Witcher-3-mod-manager/releases/latest)**

## 왜 이 앱을 만들었나요?

위쳐 3 모드 설치는 생각보다 번거롭습니다. 압축 풀기, 올바른 폴더에 복사, 스크립트 충돌 해결, 로드 순서 관리... 이 모든 과정을 자동화하여 **모드를 다운받고 → 클릭 한번이면 끝**나는 경험을 만들고 싶었습니다.

## 주요 기능

### 모드 관리
- **원클릭 설치** — .zip, .rar 파일 선택만으로 자동 설치 (폴더 구조 자동 감지)
- **활성화/비활성화** — 삭제 없이 iOS 스타일 토글로 켜고 끄기
- **드래그앤드롭 로드 순서** — 직관적인 순서 변경
- **삭제** — 확인 후 완전 제거

### 스크립트 병합
- **자동 충돌 감지** — 같은 스크립트를 수정하는 모드 자동 발견
- **3-way 병합** — diff3 알고리즘으로 자동 병합 시도
- **수동 해결** — 자동 병합 실패 시 시각적 diff 뷰

### 추천 모드 브라우저
- **카테고리별 정리** — 필수, 그래픽, 게임플레이, 편의성
- **Nexus 바로 이동** — 원하는 모드의 다운로드 페이지로 한번에
- **병합 필요 표시** — 스크립트 병합이 필요한 모드 미리 확인
- **자동 업데이트** — GitHub에서 최신 추천 목록 자동 반영

### 프리셋
- **기본 추천 프리셋** — 커뮤니티가 검증한 모드 조합
- **내 프리셋** — 현재 모드 구성을 저장하고 다른 사람과 공유
- **JSON 내보내기/가져오기**

### 기타
- **게임 자동 감지** — Steam, GOG, Epic Games 경로 + Next-Gen/Classic 버전 자동 인식
- **한국어/English** 지원
- **자동 업데이트** — 새 버전 출시 시 자동 알림
- **Toss + Apple 스타일 UI** — 깔끔하고 직관적인 인터페이스

## 설치

### 인스톨러
[Releases](https://github.com/svrforum/Witcher-3-mod-manager/releases/latest)에서 `W3-Mod-Manager-Setup-x.x.x.exe` 다운로드 → 실행

### 포터블
[Releases](https://github.com/svrforum/Witcher-3-mod-manager/releases/latest)에서 `W3-Mod-Manager-x.x.x-win.zip` 다운로드 → 압축 해제 → `W3 Mod Manager.exe` 실행

## 사용법

### 처음 시작할 때
1. 언어 선택 (한국어 / English)
2. 위쳐 3 설치 경로 자동 감지 (실패 시 수동 선택)

### 모드 설치하기
1. "모드 검색"에서 원하는 모드 찾기 → "Nexus에서 다운로드"
2. "모드 관리" → "모드 추가" → 다운받은 파일 선택
3. 끝! 게임 실행하면 적용됨

### 스크립트 충돌 해결
여러 모드가 같은 게임 스크립트를 수정하면 충돌이 발생합니다.
1. "스크립트 병합" 메뉴에서 충돌 목록 확인
2. "전체 병합" 클릭으로 자동 해결 시도
3. 자동 병합 실패 시 수동으로 어떤 변경을 적용할지 선택

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Electron 41 + React + TypeScript |
| 빌드 | electron-vite 5 |
| UI | Tailwind CSS v4 |
| 상태관리 | Zustand |
| 다국어 | react-i18next |
| 압축해제 | adm-zip, node-unrar-js |
| 스크립트병합 | node-diff3 |
| 배포 | electron-builder 26 |

## 프로젝트 구조

```
Witcher-3-mod-manager/
├── src/
│   ├── main/                    # Electron 메인 프로세스
│   │   ├── index.ts             # 앱 진입점
│   │   ├── ipc-handlers.ts      # 백엔드 API (IPC)
│   │   └── modules/             # 핵심 모듈
│   │       ├── mod-manager.ts   # 모드 설치/삭제/순서
│   │       ├── script-merger.ts # 스크립트 병합
│   │       ├── game-detector.ts # 게임 경로 감지
│   │       ├── preset-manager.ts# 프리셋 관리
│   │       └── ...
│   ├── preload/                 # IPC 브릿지
│   └── renderer/src/            # React UI
│       ├── components/          # 화면 컴포넌트
│       ├── stores/              # 상태 관리
│       └── i18n/                # 번역 파일
├── resources/presets/           # 추천 모드 프리셋
├── tests/                       # 테스트 (54개)
└── .github/workflows/           # CI/CD
```

## 개발

### 요구 사항
- Node.js 22+ (LTS)
- npm

### 시작하기

```bash
git clone https://github.com/svrforum/Witcher-3-mod-manager.git
cd Witcher-3-mod-manager
npm install
npm run dev
```

### 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 모드 실행 |
| `npm test` | 테스트 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run dist` | Windows 배포판 생성 |

## 기여하기

기여를 환영합니다!

### 버그 신고
[Issues](https://github.com/svrforum/Witcher-3-mod-manager/issues)에서 신고해주세요.

### 추천 모드 추가/수정
`resources/presets/default-presets.json`을 수정하여 PR을 보내주세요. 이 파일은 앱에서 자동으로 GitHub의 최신 버전을 가져갑니다.

```json
{
  "name": "모드 이름",
  "nexusUrl": "https://www.nexusmods.com/witcher3/mods/ID",
  "loadOrder": 0,
  "notes": "모드 설명",
  "needsMerge": false
}
```

### 번역 추가
`src/renderer/src/i18n/`에 새 언어 JSON 파일을 추가하면 됩니다.

### 코드 기여
1. Fork → 기능 브랜치 → 구현 → PR
2. TypeScript strict, React 함수형 컴포넌트
3. IPC 핸들러는 `{ success, data?, error? }` 형태 반환
4. 새 기능에는 테스트도 함께

## 후원

이 프로젝트가 도움이 되셨다면 커피 한 잔 사주세요!

<a href="https://buymeacoffee.com/svrforum">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee">
</a>

## 라이선스

MIT License

## 면책 조항

이 프로젝트는 CD Projekt Red와 공식적인 관련이 없습니다. The Witcher는 CD Projekt Red의 등록 상표입니다.
