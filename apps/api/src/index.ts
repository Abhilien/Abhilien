/**
 * HTTP API.
 *
 * Deliberately dependency-free (node:http, no framework): the surface is five
 * routes, and every dependency here is one more thing to keep patched on a
 * server that will hold people's birth data.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { castChart, gunaMilan, computePanchang, rectify } from '@jyotish/engine';
import type { BirthData, LifeEvent, EventType } from '@jyotish/engine';
import { EVENT_SIGNATURES } from '@jyotish/engine';
import { buildFactBundle } from './facts.js';
import { deterministicReading } from './deterministic.js';
import { narrate, answerQuestion, modelAvailable } from './narrator.js';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BODY_BYTES = 64 * 1024;

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    // Birth data must not be cached by intermediaries.
    'cache-control': 'no-store',
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('request body too large');
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Validate birth data rather than trusting the client's shape. */
function parseBirth(value: unknown): BirthData {
  const b = value as Partial<BirthData>;
  const loc = b?.location;
  if (
    typeof b?.year !== 'number' || typeof b?.month !== 'number' || typeof b?.day !== 'number'
    || typeof b?.hour !== 'number' || typeof b?.minute !== 'number'
    || !loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number'
    || typeof loc.timezone !== 'string'
  ) {
    throw new Error(
      'birth must supply year, month, day, hour, minute and a location with '
      + 'latitude, longitude and an IANA timezone',
    );
  }
  if (Math.abs(loc.latitude) > 90 || Math.abs(loc.longitude) > 180) {
    throw new Error('latitude must be within +/-90 and longitude within +/-180');
  }
  return b as BirthData;
}

const routes: Record<string, (body: any) => Promise<unknown>> = {
  /** The raw computation. No model involved, ever. */
  '/v1/chart': async (body) => {
    const birth = parseBirth(body.birth);
    const { chart, warnings } = castChart(birth);
    return { chart, warnings };
  },

  /** Structured findings plus the fact bundle the narrator would see. */
  '/v1/facts': async (body) => {
    const birth = parseBirth(body.birth);
    return buildFactBundle(birth, body.asOf ? new Date(body.asOf) : undefined);
  },

  /**
   * A reading. `mode: "template"` forces the zero-cost deterministic path;
   * the default uses the model and falls back to the template if the
   * guardrails reject what comes back.
   */
  '/v1/reading': async (body) => {
    const birth = parseBirth(body.birth);
    const facts = buildFactBundle(birth, body.asOf ? new Date(body.asOf) : undefined);

    if (body.mode === 'template' || !modelAvailable()) {
      return { text: deterministicReading(facts), source: 'deterministic', violations: [] };
    }
    return narrate(facts, {
      ...(typeof body.language === 'string' ? { language: body.language } : {}),
      ...(typeof body.focus === 'string' ? { focus: body.focus } : {}),
    });
  },

  /** A grounded question about one chart. */
  '/v1/ask': async (body) => {
    const birth = parseBirth(body.birth);
    if (typeof body.question !== 'string' || body.question.trim().length === 0) {
      throw new Error('question is required');
    }
    const facts = buildFactBundle(birth, body.asOf ? new Date(body.asOf) : undefined);
    return answerQuestion(facts, body.question, {
      ...(typeof body.language === 'string' ? { language: body.language } : {}),
    });
  },

  /** Ashtakoot compatibility between two charts. */
  '/v1/match': async (body) => {
    const a = castChart(parseBirth(body.first)).chart;
    const b = castChart(parseBirth(body.second)).chart;
    return gunaMilan(a, b);
  },

  /**
   * Birth-time rectification from dated life events.
   *
   * Returns a ranked shortlist with an explicit confidence that is allowed to
   * be inconclusive — and usually is, for the minute. The rising sign is
   * reported separately and is often settled even when the minute is not.
   */
  '/v1/rectify': async (body) => {
    const birth = parseBirth(body.birth);
    if (!Array.isArray(body.events) || body.events.length === 0) {
      throw new Error('events is required: a list of {type, date, precision?}');
    }

    const events: LifeEvent[] = body.events.map((raw: any, i: number) => {
      if (typeof raw?.type !== 'string' || !(raw.type in EVENT_SIGNATURES)) {
        throw new Error(
          `event ${i} has an unknown type; must be one of: `
          + `${Object.keys(EVENT_SIGNATURES).join(', ')}`,
        );
      }
      const date = new Date(raw.date);
      if (Number.isNaN(date.getTime())) throw new Error(`event ${i} has an invalid date`);
      return {
        type: raw.type as EventType,
        date,
        ...(raw.precision ? { precision: raw.precision } : {}),
        ...(typeof raw.note === 'string' ? { note: raw.note } : {}),
      };
    });

    const result = rectify(birth, events, {
      ...(typeof body.windowMinutes === 'number'
        ? { windowMinutes: Math.min(180, Math.max(5, body.windowMinutes)) } : {}),
      ...(typeof body.stepMinutes === 'number'
        ? { stepMinutes: Math.min(15, Math.max(1, body.stepMinutes)) } : {}),
    });

    // The full candidate list is large and mostly noise; the shortlist is what
    // a caller acts on.
    return { ...result, candidates: result.candidates.slice(0, 15) };
  },

  /** The life-event types rectification understands. */
  '/v1/rectify/events': async () =>
    Object.entries(EVENT_SIGNATURES).map(([type, sig]) => ({
      type, label: sig.label, primaryHouses: sig.primary, karaka: sig.karaka,
    })),

  /** Panchang for a place and moment. */
  '/v1/panchang': async (body) => {
    const loc = body.location;
    if (!loc || typeof loc.latitude !== 'number' || typeof loc.timezone !== 'string') {
      throw new Error('location with latitude, longitude and timezone is required');
    }
    return computePanchang(body.date ? new Date(body.date) : new Date(), loc);
  },
};

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/health') {
      return send(res, 200, { ok: true, model: modelAvailable() ? 'configured' : 'not configured' });
    }

    const handler = routes[url.pathname];
    if (!handler) return send(res, 404, { error: 'not found' });
    if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });

    try {
      const body = await readJson(req);
      send(res, 200, await handler(body));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      // Bad input is the client's problem; anything else is ours, and the
      // detail stays in the log rather than going back over the wire.
      const isClientError = /required|must|too large|JSON/i.test(message);
      if (!isClientError) console.error('request failed:', error);
      send(res, isClientError ? 400 : 500, {
        error: isClientError ? message : 'internal error',
      });
    }
  })();
});

server.listen(PORT, () => {
  console.log(`jyotish api listening on :${PORT}`);
  console.log(modelAvailable()
    ? 'AI narration enabled'
    : 'AI narration disabled (no ANTHROPIC_API_KEY) — template readings only');
});
