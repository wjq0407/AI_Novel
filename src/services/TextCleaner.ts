export interface CleaningStats {
  originalLength: number
  cleanedLength: number
  removedBlankLines: number
  removedDamageLines: number
  removedMarkdownArtifacts: number
}

export interface CleaningConfig {
  removeExtraBlankLines: boolean
  trimLines: boolean
  removeMarkdownHeaders: boolean
  removeDamageLines: boolean
  consolidateParagraphs: boolean
}

export const DEFAULT_CONFIG: CleaningConfig = {
  removeExtraBlankLines: true,
  trimLines: true,
  removeMarkdownHeaders: true,
  removeDamageLines: true,
  consolidateParagraphs: true,
}

/**
 * Clean extracted text from uploaded files.
 * Handles: excessive blank lines, markdown formatting artifacts,
 * game damage numbers, paragraph consolidation.
 */
export function cleanText(rawText: string, config: CleaningConfig = DEFAULT_CONFIG): { text: string; stats: CleaningStats } {
  const originalLength = rawText.length
  let text = rawText
  let removedBlankLines = 0
  let removedDamageLines = 0
  let removedMarkdownArtifacts = 0

  // Step 1: Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Step 2: Process line by line
  let lines = text.split('\n')
  const cleanedLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Trim each line
    if (config.trimLines) {
      line = line.trim()
    }

    // Remove markdown headers: "# **第一章 xxx**" -> "第一章 xxx"
    if (config.removeMarkdownHeaders) {
      const headerMatch = line.match(/^#+\s*\*?\*?(.+?)\*?\*?\s*$/)
      if (headerMatch) {
        line = headerMatch[1]
        removedMarkdownArtifacts++
      }
      // Also handle bold without header: "**text**" -> "text"
      const boldMatch = line.match(/^\*\*(.+?)\*\*$/)
      if (boldMatch && line === boldMatch[0]) {
        line = boldMatch[1]
        removedMarkdownArtifacts++
      }
    }

    // Remove game damage numbers: standalone lines like "-78", "-104", "-112"
    if (config.removeDamageLines) {
      if (/^-\d+$/.test(line)) {
        removedDamageLines++
        continue // Skip this line entirely
      }
      // Also remove lines like "头部-104", "淘汰者:xxx" which are game UI elements
      if (/^(头部|碎头|碎甲|淘汰者|击杀)/.test(line)) {
        removedDamageLines++
        continue
      }
    }

    // Remove empty separator lines like "——————" or "————————"
    if (/^—+$/.test(line)) {
      removedMarkdownArtifacts++
      continue
    }

    cleanedLines.push(line)
  }

  // Step 3: Remove consecutive blank lines
  if (config.consolidateParagraphs) {
    let consecutive = 0
    const consolidated: string[] = []
    for (const line of cleanedLines) {
      if (line === '') {
        consecutive++
        if (consecutive <= 1) {
          consolidated.push('')
        } else {
          removedBlankLines++
        }
      } else {
        consecutive = 0
        consolidated.push(line)
      }
    }
    cleanedLines.length = 0
    cleanedLines.push(...consolidated)
  }

  // Step 4: Remove leading/trailing blank lines
  while (cleanedLines.length > 0 && cleanedLines[0] === '') cleanedLines.shift()
  while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') cleanedLines.pop()

  text = cleanedLines.join('\n')

  return {
    text,
    stats: {
      originalLength,
      cleanedLength: text.length,
      removedBlankLines,
      removedDamageLines,
      removedMarkdownArtifacts,
    },
  }
}

export function getCleaningSummary(stats: CleaningStats): string {
  const parts: string[] = []
  if (stats.removedBlankLines > 0) parts.push(`删除冗余空行 ${stats.removedBlankLines} 行`)
  if (stats.removedDamageLines > 0) parts.push(`清除游戏数值 ${stats.removedDamageLines} 行`)
  if (stats.removedMarkdownArtifacts > 0) parts.push(`清理格式标记 ${stats.removedMarkdownArtifacts} 处`)
  return parts.length > 0 ? `清洗完成：${parts.join('，')}` : '文本无需清洗'
}
