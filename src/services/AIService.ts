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

export async function callAIForConversion(chapterContent: string, _chapterId: number): Promise<string> {
  const prompt = buildPrompt(chapterContent)
  const response = await callAIAPI(prompt)

  if (!response.success || !response.yamlContent) {
    throw new Error(response.error || 'AI 调用失败')
  }

  // Validate the output
  try {
    const yaml = await import('js-yaml')
    const parsed = yaml.load(response.yamlContent)
    const validation = validateScript(parsed)
    if (!validation.valid) {
      console.warn('YAML Schema 验证失败:', validation.errors)
    }
  } catch (e) {
    console.warn('YAML 解析失败:', e)
  }

  return response.yamlContent
}
