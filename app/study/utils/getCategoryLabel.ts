const CATEGORY_LABELS: Record<string, string> = {
  programming: '📚 프로그래밍 / 개발',
  design: '🎨 디자인',
  language: '🌏 외국어',
  job: '💼 취업 / 이직',
  data_science: '📊 데이터 사이언스',
  mobile_dev: '📱 모바일 앱 개발',
  game_dev: '🎮 게임 개발',
  security: '🔒 보안 / 네트워크',
  devops: '☁️ 클라우드 / DevOps',
  ai_ml: '🤖 AI / 머신러닝',
  video_editing: '🎥 영상 편집',
  music: '🎵 음악 / 작곡',
  writing: '📝 블로그 / 글쓰기',
  investment: '📈 주식 / 투자',
  reading: '📚 독서',
  certification: '✏️ 자격증',
  interview: '📋 면접 준비',
  language_test: '📖 어학시험',
  coding_test: '🎯 코딩테스트',
  web_dev: '🌐 웹 개발',
};

export function getCategoryLabel(value: string | number, categoryList?: Array<{ id: string | number; name: string }>): string {
  // categoryList가 제공되면 categoryList에서 찾기
  if (categoryList && Array.isArray(categoryList)) {
    const category = categoryList.find(cat => String(cat.id) === String(value));
    if (category) {
      return category.name;
    }
  }
  
  // categoryList가 없거나 찾지 못한 경우 기존 로직 사용
  return CATEGORY_LABELS[String(value)] || '카테고리 선택';
}

