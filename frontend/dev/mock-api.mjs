// @ts-check
/**
 * A stand-in for the CLIMS API, for developing the UI without a backend.
 *
 *   npm run mock-api                 # realistic demo data
 *   MOCK_DATA=worst npm run mock-api # the awkward data real systems contain
 *   MOCK_DATA=empty npm run mock-api # nothing recorded yet
 *
 * Then, in another terminal:
 *   VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:8787 npm run dev
 *
 * Sign in with any username; the password "wrong" is rejected, anything else
 * is accepted. MOCK_FAIL=<resource> (e.g. `users`) makes that resource return
 * a 500 so error states can be looked at. MOCK_DELAY sets latency in ms.
 *
 * It mimics the legacy API's quirks on purpose: failures as HTTP 200 with a
 * `code`, numbers as strings, "longtitude". Data lives in memory and resets on
 * restart. This file is a development tool and is never part of a build.
 */
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 8787);
const DELAY_MS = Number(process.env.MOCK_DELAY ?? 250);
const DATASET = process.env.MOCK_DATA ?? 'demo';
const TOKEN = 'mock-token';

const roles = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'DCFP' },
  { id: 3, name: 'Store in charge' },
  { id: 4, name: 'Delivery agent' },
];
const organizationUnits = [
  { id: 1, name: 'Ministry of Health' },
  { id: 2, name: 'Kampala Capital City Authority' },
  { id: 3, name: 'Gulu District Health Office' },
  { id: 4, name: 'Mbarara Regional Referral Hospital' },
];
const unitOfMeasures = [
  { id: 1, name: 'Piece' },
  { id: 2, name: 'Box of 144' },
  { id: 3, name: 'Carton' },
];

const FIRST = [
  'Sarah',
  'James',
  'Grace',
  'Peter',
  'Aisha',
  'Moses',
  'Esther',
  'Brian',
  'Joan',
  'Isaac',
];
const LAST = [
  'Nakato',
  'Okello',
  'Namutebi',
  'Mugisha',
  'Nansubuga',
  'Otim',
  'Atim',
  'Ssemakula',
  'Akello',
  'Tumusiime',
];
const TOWNS = ['Kampala', 'Gulu', 'Mbarara', 'Jinja', 'Mbale', 'Arua', 'Lira', 'Fort Portal'];

/** Thirty-four ordinary accounts: enough to need pagination. */
const demoUsers = Array.from({ length: 34 }, (_, i) => {
  const first = FIRST[i % 10];
  const last = LAST[(i * 3) % 10];
  return {
    id: i + 1,
    firstname: first,
    lastname: last,
    username: `${first}.${last}`.toLowerCase() + (i > 9 ? i : ''),
    email: `${first.toLowerCase()}${i}@example.org`,
    role: (i % 4) + 1,
    status: i % 5 === 0 ? 'inactive' : 'active',
    location: TOWNS[i % 8],
    phone_number: `+2567${String(10000000 + i * 7919).slice(0, 8)}`,
    organization_unit_id: (i % 4) + 1,
    created_at: `2026-0${(i % 9) + 1}-1${i % 9}T08:30:00Z`,
  };
});

const demo = {
  users: demoUsers,
  condoms: [
    { id: 1, category: 'Male', brand: 'Protector', type: 'Latex', unit_of_measure_id: 2 },
    { id: 2, category: 'Female', brand: 'FC2', type: 'Nitrile', unit_of_measure_id: 1 },
    { id: 3, category: 'Male', brand: 'Lifeguard', type: 'Latex', unit_of_measure_id: 3 },
  ],
  condomInventories: [
    {
      id: 1,
      condom_id: 1,
      quantity_in_stock: '12500',
      batch_number: 'PR-2026-0412',
      unit_of_measure_id: 2,
      condom_unit_cost: '350',
      date_of_delivery: '2026-10-02',
      organization_unit_id: 2,
      user_id: 1,
    },
    {
      id: 2,
      condom_id: 2,
      quantity_in_stock: 800,
      batch_number: 'FC2-88817',
      unit_of_measure_id: 1,
      condom_unit_cost: 1200.5,
      date_of_delivery: '2026-09-14',
      organization_unit_id: 3,
      user_id: 2,
    },
  ],
  hotSpots: [
    {
      id: 1,
      hotspot_name: 'Lugogo',
      contact_person_name: 'Okello James',
      contact_person_telephone: '+256700000002',
      latitude: '0.3295',
      longtitude: '32.6016',
      organization_unit_id: 2,
      hotspot_status: 'active',
    },
    {
      id: 2,
      hotspot_name: 'Gulu Main Market',
      contact_person_name: 'Atim Grace',
      contact_person_telephone: '0772111222',
      latitude: 2.7746,
      longtitude: 32.299,
      organization_unit_id: 3,
      hotspot_status: 'pending',
    },
    {
      id: 3,
      hotspot_name: 'Mbarara Taxi Park',
      contact_person_name: 'Mugisha Peter',
      contact_person_telephone: '0701333444',
      latitude: -0.6072,
      longtitude: 30.6545,
      organization_unit_id: 4,
      hotspot_status: 'inactive',
    },
  ],
};

/**
 * The same shapes with the values that break layouts: long unbroken strings,
 * other scripts, one-letter names, missing fields, zero, seven-digit counts,
 * ids that point at nothing, markup in text, a password the API should not send.
 * The awkward rows come first, because the first rows are what is on screen.
 */
const worst = {
  users: [
    {
      id: 101,
      firstname: 'Wolfeschlegelsteinhausenbergerdorff-Nalubwama',
      lastname: 'Kyomuhendo-Tibamwenda-Rwabugahya',
      username: 'averyveryveryverylongusernamethatdoesnotbreak',
      email:
        'an.unbreakably.long.email.address.for.testing.overflow@regional-referral-hospital.example.org',
      role: 'DCFP',
      status: 'pending',
      location: 'Bundibugyo–Ntoroko border post, Rwenzori sub-region',
      phone_number: '+256 (0) 772-000-000',
      organization_unit_id: 4,
      created_at: null,
      password: 'must-never-reach-the-screen',
    },
    {
      id: 102,
      firstname: 'عائشة',
      lastname: '王小明',
      username: 'x',
      email: null,
      role: null,
      status: null,
      location: null,
      phone_number: null,
      organization_unit_id: null,
      created_at: 'not a date',
    },
    {
      id: 103,
      firstname: 'Jo',
      lastname: null,
      username: 'jo',
      email: 'jo@example.org',
      role: 99,
      status: 'ARCHIVED',
      location: '<img src=x onerror=alert(1)>',
      phone_number: '0',
      organization_unit_id: 99,
      created_at: '2026-02-30',
    },
    {
      id: 104,
      firstname: '👩‍⚕️ Nurse',
      lastname: 'Élodie Ñandú III',
      username: 'nurse',
      email: 'nurse@example.org',
      role: 1,
      status: 'active',
      location: 'Kampala',
      phone_number: '+256700000004',
      organization_unit_id: 1,
      created_at: '2026-01-05T08:30:00Z',
    },
    ...demoUsers,
  ],
  condoms: [
    { id: 201, category: null, brand: null, type: '', unit_of_measure_id: 99 },
    {
      id: 202,
      category: 'Male (extra-large, ribbed, flavoured, glow-in-the-dark assortment)',
      brand: 'Protector-Plus-Ultra-Long-Brand-Name-Without-Any-Spaces',
      type: '=HYPERLINK("http://example.org","click")',
      unit_of_measure_id: 2,
    },
    ...demo.condoms,
  ],
  condomInventories: [
    {
      id: 301,
      condom_id: 77,
      quantity_in_stock: null,
      batch_number: null,
      unit_of_measure_id: null,
      condom_unit_cost: null,
      date_of_delivery: null,
      organization_unit_id: null,
      user_id: null,
    },
    {
      id: 302,
      condom_id: 1,
      quantity_in_stock: '9999999',
      batch_number: 'PR-2026-0412/A/RE-ISSUE/WAREHOUSE-7/SHELF-12',
      unit_of_measure_id: 2,
      condom_unit_cost: '0.000001',
      date_of_delivery: '2026-10-02',
      organization_unit_id: 2,
      user_id: 1,
    },
    {
      id: 303,
      condom_id: 2,
      quantity_in_stock: 0,
      batch_number: 'FC2-88817',
      unit_of_measure_id: 1,
      condom_unit_cost: 0,
      date_of_delivery: '2026-09-14',
      organization_unit_id: 3,
      user_id: 2,
    },
  ],
  hotSpots: [
    {
      id: 401,
      hotspot_name: 'Unplaced hotspot',
      contact_person_name: null,
      contact_person_telephone: null,
      latitude: null,
      longtitude: '',
      organization_unit_id: null,
      hotspot_status: 'under review',
    },
    {
      id: 402,
      hotspot_name: 'Null Island',
      contact_person_name: 'Nobody',
      contact_person_telephone: '0700000000',
      latitude: 0,
      longtitude: 0,
      organization_unit_id: 1,
      hotspot_status: 'active',
    },
    {
      id: 403,
      hotspot_name: 'Out of range',
      contact_person_name: 'Somebody',
      contact_person_telephone: '0700000001',
      latitude: 123.4,
      longtitude: 32.5,
      organization_unit_id: 1,
      hotspot_status: 'Inactive',
    },
    ...demo.hotSpots,
  ],
};

const empty = { users: [], condoms: [], condomInventories: [], hotSpots: [] };

const datasets = { demo, worst, empty };
if (!(DATASET in datasets)) {
  console.error(`Unknown MOCK_DATA "${DATASET}". Use one of: ${Object.keys(datasets).join(', ')}.`);
  process.exit(1);
}
/** @type {Record<string, Record<string, unknown>[]>} */
const tables = structuredClone(datasets[/** @type {keyof typeof datasets} */ (DATASET)]);
const lookups = { roles, organizationUnits, unitOfMeasures };
let nextId = 1000;

/** @param {http.ServerResponse} response @param {number} status @param {unknown} body */
function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

/** @param {http.IncomingMessage} request */
async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (request, response) => {
  const body = await readJson(request).catch(() => ({}));
  const [, resource = '', id] = new URL(request.url ?? '/', 'http://mock').pathname.split('/');
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

  if (process.env.MOCK_FAIL === resource) {
    return send(response, 500, {
      message: 'SQLSTATE[HY000]: internal detail that must not be shown',
    });
  }

  if (resource === 'login' && request.method === 'POST') {
    if (body.password === 'wrong') {
      return send(response, 200, { code: '401', message: 'Invalid username or password' });
    }
    return send(response, 200, {
      code: '200',
      token: TOKEN,
      user: {
        id: 1,
        username: body.username,
        firstname: 'Sarah',
        lastname: 'Nakato',
        role: 'Admin',
        email: 'sarah@example.org',
      },
    });
  }
  if (resource === 'logout') return send(response, 200, { code: '200' });
  if (request.headers.authorization !== `Bearer ${TOKEN}`) {
    return send(response, 401, { message: 'Unauthenticated.' });
  }
  if (resource in lookups)
    return send(response, 200, lookups[/** @type {keyof typeof lookups} */ (resource)]);

  const rows = tables[resource];
  if (!rows) return send(response, 404, { message: 'Not found' });

  switch (request.method) {
    case 'GET':
      return send(response, 200, rows);
    case 'POST': {
      if (resource === 'users' && rows.some((row) => row.username === body.username)) {
        return send(response, 422, {
          message: 'The given data was invalid.',
          errors: { username: ['That username is already taken.'] },
        });
      }
      const row = { id: nextId++, ...body };
      if (resource === 'condomInventories') {
        row.quantity_in_stock = body.quantity;
        row.condom_unit_cost = body.unit_cost;
      }
      rows.push(row);
      return send(response, 200, { code: '201', message: 'created' });
    }
    case 'PUT':
    case 'PATCH':
      tables[resource] = rows.map((row) => (String(row.id) === id ? { ...row, ...body } : row));
      return send(response, 200, { code: '201', message: 'updated' });
    case 'DELETE':
      tables[resource] = rows.filter((row) => String(row.id) !== id);
      return send(response, 200, { code: '201', message: 'deleted' });
    default:
      return send(response, 405, { message: 'Method not allowed' });
  }
});

// Loopback only: this server has no real authentication and must not be reachable from the network.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`CLIMS mock API (${DATASET} data) on http://127.0.0.1:${PORT}`);
});
