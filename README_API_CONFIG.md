# API 서버 설정 가이드

## 개요
이 프로젝트는 다양한 환경(개발, 배포)에서 사용할 수 있도록 API 서버 주소를 설정 파일로 관리합니다.

## 설정 방법

### 1. 개발 환경 (Expo Go)
기본적으로 개발 PC의 IP 주소(`192.168.0.41`)를 사용합니다.
다른 PC에서 개발할 경우 `app/config/api.ts` 파일의 `DEV_PC_IP` 값을 변경하세요.

```typescript
// app/config/api.ts
const DEV_PC_IP = '192.168.0.41'; // 개발 PC의 IP 주소로 변경
```

### 2. 환경 변수 사용 (권장)
환경 변수를 사용하여 설정할 수 있습니다.

#### 방법 1: app.json에 extra 설정 추가
```json
{
  "expo": {
    "extra": {
      "devPcIp": "192.168.0.41",
      "apiBaseUrl": "http://192.168.0.41",
      "prodServerUrl": "https://your-production-server.com"
    }
  }
}
```

#### 방법 2: .env 파일 사용 (expo-constants 필요)
```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.41
EXPO_PUBLIC_DEV_PC_IP=192.168.0.41
EXPO_PUBLIC_PROD_SERVER_URL=https://your-production-server.com
```

### 3. 프로덕션 환경 (JAR 배포)
JAR 파일로 배포하는 경우, `app/config/api.ts` 파일에서 프로덕션 서버 주소를 설정하거나 환경 변수를 사용하세요.

```typescript
// app/config/api.ts
const PROD_SERVER_URL = 'https://your-production-server.com';
```

또는 빌드 시 환경 변수로 설정:
```bash
EXPO_PUBLIC_PROD_SERVER_URL=https://your-production-server.com
```

## 서비스별 포트
- **Study Service**: 8080
- **Auth Service**: 8082
- **Schedule Service**: 포트 정보 없음 (Base URL만 사용)

## 다른 PC에서 개발할 때
1. `app/config/api.ts` 파일 열기
2. `DEV_PC_IP` 값을 해당 PC의 IP 주소로 변경
3. 또는 `app.json`의 `extra` 섹션에 `devPcIp` 추가

## 배포 시 주의사항
- 프로덕션 빌드 전에 `PROD_SERVER_URL` 설정 확인
- HTTPS 사용 권장 (프로덕션 환경)
- 환경 변수로 민감한 정보 관리




