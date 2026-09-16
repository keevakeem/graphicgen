const https = require('https');

module.exports = async (req, res) => {
  // CORS 및 HTTP 메소드 제어
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keyword } = req.body || {};
  if (!keyword) return res.status(400).json({ error: '키워드를 입력해주세요.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
  }

  const payload = JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `주제 키워드: "${keyword}"
이 키워드에 맞는 다양한 구도/동작의 아이콘 묘사 문장 3개를 생성해줘.
반드시 마크다운 코드블록(```)이나 설명 없이 pure JSON 배열 형식으로만 응답해줘.

[
  {"ko": "몸을 동그랗게 말고 잠든 듯한 고양이", "en": "a cat curled into a tight, sleeping ball"},
  {"ko": "고개를 살짝 기울인 채 앉아있는 동글동글한 고양이", "en": "a round, chubby cat sitting with its head tilted"},
  {"ko": "웅크리고 앉아 꼬리를 동그랗게 만 통통한 고양이", "en": "a plump cat curled up with its tail wrapped around itself"}
]`
      }
    ]
  });

  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload)
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        const parsedData = JSON.parse(data);
        if (response.statusCode >= 400) {
          return res.status(response.statusCode).json({
            error: `Anthropic API 에러 (${response.statusCode}): ${parsedData.error?.message || JSON.stringify(parsedData)}`
          });
        }

        const rawText = parsedData.content?.[0]?.text?.trim() || '[]';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const suggestions = JSON.parse(cleanJson);

        return res.status(200).json({ suggestions });
      } catch (err) {
        return res.status(500).json({ error: `응답 파싱 실패: ${err.message}` });
      }
    });
  });

  request.on('error', (err) => {
    return res.status(500).json({ error: `네트워크 요청 실패: ${err.message}` });
  });

  request.write(payload);
  request.end();
};
