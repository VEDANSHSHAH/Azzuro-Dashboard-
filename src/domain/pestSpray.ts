import { isISODate } from './dates'
import type { ISODate, PestSprayRoomInput, Property } from './models'

const propertyMatchers: ReadonlyArray<readonly [Property, RegExp]> = [
  ['potts-point', /\bpotts(?:\s|-)*(?:point|pt)\b|\bpotts\b/i],
  ['pyrmont', /\bpyrmont\b/i],
  ['olympic', /\bolympic\b/i],
  ['central', /\bcentral\b/i],
  ['allen', /\ballen\b/i],
]

/**
 * The initial room register supplied for this private operations workspace.
 * It contains only property names and room labels; source codes and room details
 * are deliberately not retained here.
 */
const masterRoomNumbers: ReadonlyArray<readonly [Property, readonly string[]]> = [
  ['central', ['101', '102', '103', '104', '201', '202', '203', '204', '205', '206', '207']],
  ['potts-point', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '204', '204A', '305', '305A', '301', '301A', '302', '302A', '303', '304', '304A', '101', '101A', '102', '102A', '103', '104', '105']],
  ['allen', Array.from({ length: 28 }, (_, index) => String(index + 1))],
  ['olympic', Array.from({ length: 30 }, (_, index) => String(index + 1))],
  ['pyrmont', Array.from({ length: 14 }, (_, index) => String(index + 1))],
]

export function getInitialPestSprayRooms(): PestSprayRoomInput[] {
  return masterRoomNumbers.flatMap(([property, roomNumbers]) =>
    roomNumbers.map((roomNumber) => ({ property, roomName: `Room ${roomNumber}` })),
  )
}

function normalizeWhitespace(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ')
}

function roomNameFromToken(token: string): string {
  const normalizedToken = normalizeWhitespace(token).replace(/[^a-z0-9]/gi, '')
  return normalizedToken ? `Room ${normalizedToken.toUpperCase()}` : ''
}

function tokensFromList(value: string): string[] {
  return value
    .split(/\s*(?:,|\/|&|\band\b|-)\s*/i)
    .map(roomNameFromToken)
    .filter(Boolean)
}

function findProperty(value: string): Property | null {
  return propertyMatchers.find(([, matcher]) => matcher.test(value))?.[0] ?? null
}

function extractRoomNames(line: string): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  const addNames = (value: string) => {
    for (const name of tokensFromList(value)) {
      const key = pestSprayRoomKey(name)
      if (key && !seen.has(key)) {
        seen.add(key)
        names.push(name)
      }
    }
  }

  const labelledRooms = /\b(?:rooms?|rms?)\.?\s*(?:no\.?\s*)?(?::|–|—|-)?\s*#?\s*([a-z]?\d+[a-z]?(?:\s*(?:,|\/|&|\band\b|-)\s*(?:[a-z]?\d+[a-z]?))*)/gi
  for (const match of line.matchAll(labelledRooms)) addNames(match[1])

  if (names.length) return names

  const withoutBullet = line.replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '')
  const bareList = withoutBullet.match(
    /^#?\s*([a-z]?\d+[a-z]?(?:\s*(?:,|\/|&|\band\b|-)\s*(?:[a-z]?\d+[a-z]?))*)\s*$/i,
  )
  if (bareList) addNames(bareList[1])

  return names
}

/**
 * Converts room labels into a stable name. The register accepts `7`, `Room 7`,
 * and `room #7` as the same room once a daily spray list is imported.
 */
export function normalizePestSprayRoomName(value: string): string {
  const normalized = normalizeWhitespace(value)
  const roomMatch = normalized.match(/^(?:room|rm|rms)\.?\s*#?\s*(.+)$/i)
  return roomMatch ? `Room ${normalizeWhitespace(roomMatch[1]).toUpperCase()}` : normalized
}

export function pestSprayRoomKey(value: string): string {
  return normalizePestSprayRoomName(value)
    .replace(/^(?:room|rm|rms)\s*/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLocaleLowerCase()
}

export function normalizePestSprayDates(value: unknown): ISODate[] {
  if (!Array.isArray(value)) return []

  return [...new Set(value.filter(isISODate))].sort((left, right) => right.localeCompare(left))
}

/**
 * Parses a pasted empty-room list. Property headings may use any order, case,
 * markdown bullets, dashes, or words such as "Empty rooms". Room lines can be
 * written as `Room 7`, `7`, or comma-separated room numbers under a heading.
 */
export function parsePestSprayRoomList(value: string): PestSprayRoomInput[] {
  const rooms: PestSprayRoomInput[] = []
  const seen = new Set<string>()
  let activeProperty: Property | null = null

  for (const rawLine of value.replace(/\r\n?/g, '\n').split('\n')) {
    const line = normalizeWhitespace(rawLine)
    if (!line) continue

    const detectedProperty = findProperty(line)
    if (detectedProperty) activeProperty = detectedProperty
    if (!activeProperty) continue

    const propertyMatcher = detectedProperty
      ? propertyMatchers.find(([property]) => property === detectedProperty)?.[1]
      : null
    const roomCandidates = [
      ...extractRoomNames(line),
      ...(propertyMatcher ? extractRoomNames(line.replace(propertyMatcher, '')) : []),
    ]

    for (const roomName of roomCandidates) {
      const normalizedRoomName = normalizePestSprayRoomName(roomName)
      const key = `${activeProperty}:${pestSprayRoomKey(normalizedRoomName)}`
      if (!pestSprayRoomKey(normalizedRoomName) || seen.has(key)) continue
      seen.add(key)
      rooms.push({ property: activeProperty, roomName: normalizedRoomName })
    }
  }

  return rooms
}
