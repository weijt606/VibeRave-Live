// Minimal OpenAI-compatible chat completions mock for booth testing
// (no key, no network). Answers adult vs kids from the HOST header the
// skill prompt injects; "慢慢来" / "slow-llm" in the prompt delays 4 s so
// queueing can be exercised. Point the provider chain at it:
//
//   node services/api/scripts/mock-llm.mjs            # port 4399
//   LLM_PROVIDERS=dead,mock \
//   LLM_DEAD_BASE_URL=http://127.0.0.1:9/v1 LLM_DEAD_API_KEY=x LLM_DEAD_MODEL=dead \
//   LLM_MOCK_BASE_URL=http://127.0.0.1:4399/v1 LLM_MOCK_API_KEY=x LLM_MOCK_MODEL=mock \
//   pnpm --filter @viberave/api dev
//
// `dead` is unreachable on purpose so the chain's failover shows up in
// GET /health/providers.
import http from 'node:http';
const ADULT =
  '$: s("bd*2, [~ hh]*4, ~ sd").bank("tr909").lpf(1200).room(.2).gain(.8)\nEXPLAIN: 换成了更暗的 909 鼓组，加了一点混响';
const KIDS =
  '$: n("0 2 4 7 4 2").scale("C:major").s("triangle").release(.2).gain(.6)\nEXPLAIN: 用钢琴音色弹了一段开心的 C 大调';
let calls = 0;
http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      calls++;
      if (req.url.endsWith('/models')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ data: [{ id: 'mock' }] }));
      }
      let j = {};
      try {
        j = JSON.parse(body);
      } catch {}
      const msgs = j.messages || [];
      const sys = msgs
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n');
      const user = msgs
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n');
      const kids = !/family mode OFF/.test(sys);
      const delay = /慢慢来|slow-llm/.test(user) ? 4000 : 1200;
      console.log(
        `[mock-llm] #${calls} model=${j.model} kids=${kids} delay=${delay} sys=${sys.length}B user=${user.slice(-60).replace(/\n/g, ' ')}`,
      );
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'mock',
            object: 'chat.completion',
            model: j.model,
            choices: [
              { index: 0, message: { role: 'assistant', content: kids ? KIDS : ADULT }, finish_reason: 'stop' },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      }, delay);
    });
  })
  .listen(Number(process.env.MOCK_LLM_PORT) || 4399, '127.0.0.1', () => console.log('[mock-llm] listening on 4399'));
