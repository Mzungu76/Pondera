// Minimal Anthropic Messages API mock for local E2E runs. Not part of the app.
import http from 'node:http';
import { outputs } from '../tests/fixtures.ts';

const order = ['understand', 'biases', 'challenge', 'perspectives', 'matrix', 'report'];
const state = { failStage: null, garbageStage: null, calls: [], delayMs: 150 };

http
  .createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    if (req.url?.startsWith('/__mode')) {
      const u = new URL(req.url, 'http://x');
      state.failStage = u.searchParams.get('fail');
      state.garbageStage = u.searchParams.get('garbage');
      if (u.searchParams.get('reset')) state.calls = [];
      res.end(JSON.stringify(state));
      return;
    }
    if (req.url?.startsWith('/__calls')) return res.end(JSON.stringify(state.calls));
    const body = JSON.parse(raw);
    const isRepair = body.system.startsWith('You repair');
    const m = body.messages[0].content.match(/stage "(\w+)" now/);
    const stage = m?.[1] ?? 'repair';
    state.calls.push({ stage, isRepair, hasKey: Boolean(req.headers['x-api-key']) });
    await new Promise((r) => setTimeout(r, state.delayMs));
    if (stage === state.failStage) {
      res.statusCode = 529;
      return res.end('{}');
    }
    const text = stage === state.garbageStage || isRepair ? 'non json' : JSON.stringify(outputs[stage]);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ content: [{ type: 'text', text }], usage: { input_tokens: 1200, output_tokens: 800 }, stop_reason: 'end_turn' }));
  })
  .listen(8799, () => console.log('mock anthropic on 8799'));
