/**
 * Read-only real HTTP probe for the fixed download; fixture bytes are independent expectations.
 *
 * The server must opt into the fixture (`assistant-desk-projection` config `allowFixture: true`,
 * e.g. via dev/probes/web/projection-fixture.patch.yml). Production defaults to 404 when no
 * ledger exists, so a fixture in a real home is never served as data.
 */
import { readFile } from 'node:fs/promises'

const [loginArg, fixtureArg] = process.argv.slice(2)
if (!loginArg || !fixtureArg) throw new Error('usage: node desk-projection-download.mjs <authenticated-url> <fixture-file>')
const login = new URL(loginArg)
const base = new URL('.', login)
const endpoint = new URL('api/assistant/desk-projection', base)
const expected = await readFile(fixtureArg, 'utf8')
function assert(value, message) {
  if (!value) throw new Error(message)
}
const anonymous = await fetch(endpoint)
assert(anonymous.status === 401, `anonymous status: ${anonymous.status}`)
const tokenOnApi = new URL(endpoint)
tokenOnApi.search = login.search
assert((await fetch(tokenOnApi)).status === 401, 'launch token must not authenticate download')
const exchange = await fetch(login, { redirect: 'manual' })
assert(exchange.status === 303, `login exchange status: ${exchange.status}`)
const cookies = exchange.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
assert(cookies.length > 0, 'login exchange did not set a cookie')
const headers = { cookie: cookies }
const response = await fetch(endpoint, { headers, redirect: 'error' })
assert(response.status === 200, `download status: ${response.status}`)
assert(await response.text() === expected, 'download differs from independent fixture bytes')
assert(response.headers.get('cache-control') === 'no-store', 'download must not be cached')
assert((await fetch(endpoint, { headers: { ...headers, origin: 'https://untrusted.example' } })).status === 403, 'foreign Origin must be refused')
const query = new URL(endpoint)
query.search = '?path=/etc/passwd'
assert((await fetch(query, { headers })).status === 400, 'caller-selected path must be refused')
assert((await fetch(endpoint, { method: 'POST', headers })).status !== 200, 'download must not accept writes')
console.log('PASS fixed projection: anonymous/token 401; cookie bytes match; Origin 403; query 400; no write method')
