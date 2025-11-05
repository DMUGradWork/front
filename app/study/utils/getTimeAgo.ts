// 시간 유틸리티 함수
export function getTimeAgo(dateString: string): string {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // 초 단위
  if (diff < 60) return `${diff}초 전 대화`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전 대화`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전 대화`;
  return `${Math.floor(diff / 86400)}일 전 대화`;
}

