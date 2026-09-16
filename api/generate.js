import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // CORS 및 HTTP 메소드 제어
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword } = req.body || {};
  if (!keyword) {
    return res.status(400).json({ error: '키워드를 입력해주세요.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    const anthropic = new Anthropic({ apiKey: apiKey.trim() });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `주제 키워드: "${keyword}"
이 키워드에 맞는 다양한 구도/동작의 아이콘 묘사 문장 3개를 생성해줘.
반드시 마크다운 코드블록(```)이나 부연설명 없이, pure JSON 배열 형식으로만 응답해줘.

[
  {"ko": "몸을 동그랗게 말고 잠든 듯한 고양이", "en": "a cat curled into a tight, sleeping ball"},
  {"ko": "고개를 살짝 기울인 채 앉아있는 동글동글한 고양이", "en": "a round, chubby cat sitting with its head tilted"},
  {"ko": "웅크리고 앉아 꼬리를 동그랗게 만 통통한 고양이", "en": "a plump cat curled up with its tail wrapped around itself"}
]`
        }
      ]
    });

    const rawText = response.content[0].text.trim();
    // Claude가 혹시 마크다운을 섞어 보냈을 경우 대비 안전 파싱
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const suggestions = JSON.parse(cleanJson);

    return res.status(200).json({ suggestions });

  } catch (error) {
    // Vercel 에러가 나더라도 클라이언트가 읽을 수 있도록 항상 JSON 구조 유지
    return res.status(500).json({ error: `API 오류: ${error.message}` });
  }
}
