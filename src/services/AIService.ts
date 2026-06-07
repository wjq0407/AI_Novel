import { buildPrompt } from './PromptBuilder'
import { validateScript } from './SchemaValidator'

const API_KEY = import.meta.env.VITE_AI_API_KEY || ''
const API_URL = import.meta.env.VITE_AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL = import.meta.env.VITE_AI_MODEL || 'glm-4'

export interface AIResponse {
  success: boolean
  yamlContent?: string
  error?: string
}

async function callAIAPI(prompt: string, retries = 2): Promise<AIResponse> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: '你是专业的剧本改编专家。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      })

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('AI 返回内容为空')
      }

      // Clean up YAML content - extract between code blocks if present
      let yamlContent = content.trim()
      
      // Extract YAML from code blocks (supports ```yaml, ```YAML, or just ```)
      const codeBlockMatch = yamlContent.match(/```(?:yaml|YAML)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        yamlContent = codeBlockMatch[1].trim()
      }
      
      // Remove leading/trailing empty lines
      yamlContent = yamlContent.replace(/^[\n\r]+|[\n\r]+$/g, '')
      
      console.log('AI 返回内容已清理, 长度:', yamlContent.length)
      console.log('YAML 前100字符:', yamlContent.substring(0, 100))

      return { success: true, yamlContent }
    } catch (error) {
      console.error(`AI API 调用失败 (attempt ${i + 1}):`, error)
      if (i === retries) {
        return { success: false, error: (error as Error).message }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
  return { success: false, error: '未知错误' }
}

// Fix common YAML issues in AI output
function fixYamlContent(yamlStr: string): string {
  let result = yamlStr
  
  // Step 0: Fix truncated YAML - remove incomplete trailing lines
  // If the last line is just a dash or incomplete, remove it
  const linesBefore = result.split('\n')
  while (linesBefore.length > 0) {
    const lastLine = linesBefore[linesBefore.length - 1].trim()
    if (lastLine === '' || lastLine === '-' || lastLine === '- ') {
      linesBefore.pop()
    } else if (lastLine.length < 10 && !lastLine.includes(':')) {
      // Very short line without a colon is likely truncated
      linesBefore.pop()
    } else {
      break
    }
  }
  result = linesBefore.join('\n')
  
  // Step 1: Clean up placeholder patterns like """""""""" or ''''''''''
  result = result.replace(/"{8,}"/g, '""')
  result = result.replace(/'{8,}'/g, "''")
  
  // Step 2: Remove ALL AI line number references (multiple patterns)
  // Pattern: "text" 13 | more text → split at number + pipe
  // Pattern: " 13 | → remove
  // Pattern: 13 | → remove  
  // Pattern: text" 90 | text → split
  result = result.replace(/([^|]+)"\s+\d+\s*\|/g, '$1"\n')
  result = result.replace(/"\s+\d+\s*\|/g, '"\n')
  result = result.replace(/([^|]\s)\s*\d+\s*\|\s+/g, '$1\n')
  result = result.replace(/\s+\d+\s*\|/g, '\n')
  
  // Step 3: Split lines that have multiple key:value pairs merged with |
  // e.g., content: "text" | emotion: "mood" | action: "something"
  const mergedLines = result.split('\n')
  const expanded: string[] = []
  
  for (const line of mergedLines) {
    const trimmed = line.trimStart()
    const indent = line.length - trimmed.length
    
    if (trimmed === '' || trimmed.startsWith('#')) {
      expanded.push(line)
      continue
    }
    
    // Check if this line has multiple |-separated key: value pairs
    if (trimmed.includes(' | ') || trimmed.includes('| ')) {
      const parts = trimmed.split(/\s*\|\s*/)
      // First part keeps the original indent
      expanded.push(' '.repeat(indent) + parts[0])
      // Subsequent parts get increased indent
      for (let p = 1; p < parts.length; p++) {
        if (parts[p].trim().includes(':')) {
          expanded.push(' '.repeat(indent + 2) + parts[p].trim())
        } else {
          expanded.push(' '.repeat(indent) + parts[p].trim())
        }
      }
      continue
    }
    
    expanded.push(line)
  }
  result = expanded.join('\n')
  
  // Step 4: Remove duplicate keys (keep last occurrence at same indent)
  const processLines = result.split('\n')
  const deduped: string[] = []
  
  for (let i = 0; i < processLines.length; i++) {
    const line = processLines[i]
    const trimmed = line.trimStart()
    const kvMatch = trimmed.match(/^(-\s+)?(\w[\w-]*):\s*(.*)$/)
    
    if (kvMatch) {
      const key = kvMatch[2]
      const currentIndent = line.length - trimmed.length
      
      // If same key as previous line under same indent, remove previous
      if (deduped.length > 0) {
        const prevLine = deduped[deduped.length - 1]
        const prevTrimmed = prevLine.trimStart()
        const prevIndent = prevLine.length - prevTrimmed.length
        const prevKvMatch = prevTrimmed.match(/^(-\s+)?(\w[\w-]*):\s*(.*)$/)
        
        if (prevKvMatch && prevKvMatch[2] === key && prevIndent === currentIndent) {
          deduped.pop()
        }
      }
    }
    
    deduped.push(line)
  }
  result = deduped.join('\n')
  
  // Step 5: Fix quoted strings with unescaped inner quotes
  result = result.replace(/:\s*"([^"]*)\s+"([^"]+)"\s+([^"]*)"$/gm, (_match, before, inner, after) => {
    return `: "${before} \\"${inner}\\" ${after}"`
  })
  
  // Step 6: Line-by-line fixes
  const finalLines = result.split('\n')
  const fixed: string[] = []
  
  for (let i = 0; i < finalLines.length; i++) {
    let line = finalLines[i]
    const trimmed = line.trimStart()
    const indent = line.length - trimmed.length
    
    if (trimmed === '' || trimmed.startsWith('#')) {
      fixed.push(line)
      continue
    }
    
    // Fix quoted strings with unescaped inner quotes
    const quotedMatch = trimmed.match(/^(-\s+)?(\w[\w-]*):\s*"(.*?)$/s)
    if (quotedMatch) {
      const prefix = quotedMatch[1] || ''
      const key = quotedMatch[2]
      const value = quotedMatch[3].trim()
      
      const quoteCount = (value.match(/"/g) || []).length
      if (quoteCount % 2 !== 0 || value.includes('" ')) {
        let fixedValue = value.replace(/"\s*(\S+?)\s*"/g, '\\"$1\\"')
        line = ' '.repeat(indent) + prefix + key + ': "' + fixedValue
      }
      fixed.push(line)
      continue
    }
    
    // Fix: quote unquoted string values that contain colons
    const kvMatch = trimmed.match(/^(-\s+)?(\w[\w-]*):\s*(.+)$/)
    if (kvMatch) {
      const prefix = kvMatch[1] || ''
      const key = kvMatch[2]
      let value = kvMatch[3].trim()
      
      if (!value.startsWith('"') && !value.startsWith("'") && value.includes(':')) {
        value = `"${value.replace(/"/g, '\\"')}"`
        line = ' '.repeat(indent) + prefix + key + ': ' + value
      }
    }
    
    // Fix indentation for list items
    if (trimmed.startsWith('- ')) {
      let parentIndent = 0
      for (let j = i - 1; j >= 0; j--) {
        const prevTrimmed = finalLines[j].trimStart()
        if (prevTrimmed === '' || prevTrimmed.startsWith('#')) continue
        if (!prevTrimmed.startsWith('- ')) {
          parentIndent = finalLines[j].length - prevTrimmed.length
          break
        }
      }
      const expectedIndent = parentIndent + 2
      if (indent !== expectedIndent) {
        const itemContent = trimmed.slice(2)
        if (itemContent.includes(':') && !itemContent.startsWith('"')) {
          const itemMatch = itemContent.match(/^(\w[\w-]*):\s*(.+)$/)
          if (itemMatch) {
            let itemValue = itemMatch[2].trim()
            if (!itemValue.startsWith('"') && !itemValue.startsWith("'") && itemValue.includes(':')) {
              itemValue = `"${itemValue.replace(/"/g, '\\"')}"`
            }
            fixed.push(' '.repeat(expectedIndent) + '- ' + itemMatch[1] + ': ' + itemValue)
            continue
          }
        }
        fixed.push(' '.repeat(expectedIndent) + trimmed)
        continue
      }
    }
    
    fixed.push(line)
  }
  
  return fixed.join('\n')
}

export async function callAIForConversion(chapterContent: string, _chapterId: number): Promise<string> {
  const prompt = buildPrompt(chapterContent)
  
  // Try up to 3 times with validation
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await callAIAPI(prompt)

    if (!response.success || !response.yamlContent) {
      throw new Error(response.error || 'AI 调用失败')
    }

    // Try to fix common YAML issues
    let yamlContent = fixYamlContent(response.yamlContent)

    // Validate the output
    try {
      const yaml = await import('js-yaml')
      const parsed = yaml.load(yamlContent)
      const validation = validateScript(parsed)
      if (!validation.valid) {
        console.warn(`尝试 ${attempt + 1}: YAML Schema 验证失败:`, validation.errors)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
      } else {
        return yamlContent
      }
    } catch (e) {
      console.warn(`尝试 ${attempt + 1}: YAML 解析失败:`, (e as Error).message)
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }
      // Return the original content for UI to display
      return response.yamlContent
    }
    
    return yamlContent
  }
  
  throw new Error('多次尝试后 YAML 格式仍然无效')
}
