export type PrerequisiteExpression =
  | { type: "course"; courseCode: string }
  | { type: "and" | "or"; children: PrerequisiteExpression[] }

export interface PrerequisiteParseResult {
  complete: boolean
  expression?: PrerequisiteExpression
  extractedCourseCodes: string[]
  originalText: string
}

export interface PrerequisiteParserOptions {
  allowedPrefixes?: ReadonlySet<string>
}

type Token =
  { type: "course"; courseCode: string } | { type: "and" | "or" | "leftParen" | "rightParen" }

const RESERVED_PREFIXES = new Set(["ABOVE", "AND", "FROM", "OR", "TO"])
const LEGACY_PREFIXES = new Set(["CORE"])
const TOKEN_PATTERN =
  /\(|\)|\bAND\b|\bOR\b|\b([A-Z][A-Z+]{1,7})\s*-?\s*(\d{4}[A-Z]?)\b|\b(\d{4}[A-Z]?)\b/gi

function hasMeaningfulText(value: string): boolean {
  return /[A-Z0-9]/i.test(value)
}

function tokenize(
  text: string,
  options: PrerequisiteParserOptions,
): { tokens: Token[]; unknownText: boolean } {
  const tokens: Token[] = []
  let cursor = 0
  let lastCoursePrefix: string | undefined
  let unknownText = false

  TOKEN_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TOKEN_PATTERN.exec(text))) {
    const gap = text.slice(cursor, match.index)
    const meaningfulGap = hasMeaningfulText(gap)
    if (meaningfulGap) unknownText = true
    if (meaningfulGap || /[.;]/.test(gap)) lastCoursePrefix = undefined

    const raw = match[0].toUpperCase()
    const prefix = match[1]?.toUpperCase()
    const courseNumber = match[2]?.toUpperCase()
    const bareNumber = match[3]?.toUpperCase()

    if (raw === "(") {
      tokens.push({ type: "leftParen" })
    } else if (raw === ")") {
      tokens.push({ type: "rightParen" })
    } else if (raw === "AND") {
      tokens.push({ type: "and" })
    } else if (raw === "OR") {
      tokens.push({ type: "or" })
    } else if (prefix && courseNumber) {
      const allowed =
        !options.allowedPrefixes ||
        options.allowedPrefixes.has(prefix) ||
        LEGACY_PREFIXES.has(prefix)
      if (RESERVED_PREFIXES.has(prefix) || !allowed) {
        unknownText = true
      } else {
        tokens.push({ type: "course", courseCode: `${prefix} ${courseNumber}` })
        lastCoursePrefix = prefix
      }
    } else if (bareNumber) {
      const previousToken = tokens[tokens.length - 1]
      if (
        lastCoursePrefix &&
        previousToken &&
        gap.trim() === "" &&
        (previousToken.type === "and" || previousToken.type === "or")
      ) {
        tokens.push({ type: "course", courseCode: `${lastCoursePrefix} ${bareNumber}` })
      } else {
        unknownText = true
      }
    }

    cursor = TOKEN_PATTERN.lastIndex
  }

  if (hasMeaningfulText(text.slice(cursor))) unknownText = true
  return { tokens, unknownText }
}

function combine(
  type: "and" | "or",
  left: PrerequisiteExpression,
  right: PrerequisiteExpression,
): PrerequisiteExpression {
  const leftChildren = left.type === type ? left.children : [left]
  const rightChildren = right.type === type ? right.children : [right]
  return { type, children: [...leftChildren, ...rightChildren] }
}

function parseTokens(tokens: Token[]): { expression?: PrerequisiteExpression; consumed: number } {
  let position = 0

  function parsePrimary(): PrerequisiteExpression | undefined {
    const token = tokens[position]
    if (!token) return undefined

    if (token.type === "course") {
      position += 1
      return { type: "course", courseCode: token.courseCode }
    }

    if (token.type === "leftParen") {
      position += 1
      const expression = parseOr()
      if (!expression || tokens[position]?.type !== "rightParen") return undefined
      position += 1
      return expression
    }

    return undefined
  }

  function parseAnd(): PrerequisiteExpression | undefined {
    let expression = parsePrimary()
    if (!expression) return undefined

    while (tokens[position]?.type === "and") {
      position += 1
      const right = parsePrimary()
      if (!right) return undefined
      expression = combine("and", expression, right)
    }
    return expression
  }

  function parseOr(): PrerequisiteExpression | undefined {
    let expression = parseAnd()
    if (!expression) return undefined

    while (tokens[position]?.type === "or") {
      position += 1
      const right = parseAnd()
      if (!right) return undefined
      expression = combine("or", expression, right)
    }
    return expression
  }

  return { expression: parseOr(), consumed: position }
}

export function parsePrerequisite(
  originalText: string,
  options: PrerequisiteParserOptions = {},
): PrerequisiteParseResult {
  const trimmedText = originalText.trim()
  if (!trimmedText) {
    return { complete: true, extractedCourseCodes: [], originalText }
  }

  const { tokens, unknownText } = tokenize(trimmedText, options)
  const extractedCourseCodes = Array.from(
    new Set(tokens.flatMap((token) => (token.type === "course" ? [token.courseCode] : []))),
  )
  const parsed = parseTokens(tokens)
  const complete = !unknownText && Boolean(parsed.expression) && parsed.consumed === tokens.length

  return {
    complete,
    expression: complete ? parsed.expression : undefined,
    extractedCourseCodes,
    originalText,
  }
}
