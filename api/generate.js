export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: '키워드를 입력해주세요.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Vercel에 ANTHROPIC_API_KEY가 설정되지 않았습니다.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `주제 키워드: "${keyword}"
이 키워드에 맞는 다양한 구도/동작의 아이콘 묘사 문장 3개를 생성해줘.
반드시 아래 JSON 배열 형식으로만 응답해줘. 설명이나 마크다운 코드블록(```)은 완전히 제외해줘.

[
  {"ko": "몸을 동그랗게 말고 잠든 듯한 고양이", "en": "a cat curled into a tight, sleeping ball"},
  {"ko": "고개를 살짝 기울인 채 앉아있는 동글동글한 고양이", "en": "a round, chubby cat sitting with its head tilted"},
  {"ko": "웅크리고 앉아 꼬리를 동그랗게 만 통통한 고양이", "en": "a plump cat curled up with its tail wrapped around itself"}
]`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || JSON.stringify(data) });
    }

    const rawText = data.content[0].text.trim();
    const suggestions = JSON.parse(rawText);
    
    return res.status(200).json({ suggestions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
