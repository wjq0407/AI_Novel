import React, { useState, useEffect } from 'react'
import { Card, Tabs, Typography, Button, message, Space, Table, Tag } from 'antd'
import { DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import * as yaml from 'js-yaml'
import './PreviewPage.css'

const { Title, Text } = Typography

interface SceneCharacter { name: string; role: string }
interface Dialogue { speaker: string; content: string; emotion?: string; action?: string }
interface Scene { scene_id: string; location: string; time?: string; characters: SceneCharacter[]; dialogues: Dialogue[]; narration?: string }
interface ScriptData { script: { title: string; source_chapter: number; scenes: Scene[] } }

// Fallback: normalize AI output that uses different field names
function normalizeScript(data: any, chapterId: number): ScriptData {
  // Case 1: Correct format (script.scenes)
  if (data?.script?.scenes) {
    return { ...data, script: { ...data.script, scenes: data.script.scenes || [], source_chapter: chapterId } } as ScriptData
  }
  
  // Case 2: AI returns { title, characters, scenes } at root level
  if (data?.scenes) {
    const normalizedScenes = data.scenes.map((s: any, i: number) => ({
      scene_id: `S${s.scene_id || s.scene || i + 1}`,
      location: s.location || s.place || '未知',
      time: s.time || '未知',
      characters: (s.characters || data.characters || []).map((c: any) => ({
        name: c.name || c.character || '未知',
        role: c.role || c.type || '未知'
      })),
      dialogues: (s.dialogues || []).map((d: any) => ({
        speaker: d.speaker || d.character || '未知',
        content: d.content || d.line || '',
        emotion: d.emotion || d.mood || '',
        action: d.action || ''
      })),
      narration: s.narration || ''
    }))
    return {
      script: {
        title: data.title || `第 ${chapterId} 章`,
        source_chapter: chapterId,
        scenes: normalizedScenes
      }
    }
  }
  
  throw new Error('无法识别的 YAML 结构')
}

const PreviewPage: React.FC = () => {
  const navigate = useNavigate()
  const [scripts, setScripts] = useState<ScriptData[]>([])
  const [activeTab, setActiveTab] = useState('0')
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [rawResults, setRawResults] = useState<Record<string, string>>({})

  useEffect(() => {
    const resultsStr = sessionStorage.getItem('conversionResults')
    if (!resultsStr) {
      message.warning('暂无转换结果，请先完成 AI 转换')
      setParseErrors(['暂无转换结果'])
      return
    }
    try {
      const results: Record<string, string> = JSON.parse(resultsStr)
      setRawResults(results)
      const parsedScripts: ScriptData[] = []
      const errors: string[] = []
      
      for (const [chapterId, yamlStr] of Object.entries(results)) {
        try {
          const parsed = yaml.load(yamlStr) as any
          // Try to normalize the data to handle different AI output formats
          const normalized = normalizeScript(parsed, parseInt(chapterId, 10))
          if (!normalized?.script?.scenes) {
            errors.push(`第 ${chapterId} 章：无法解析场景数据`)
            continue
          }
          parsedScripts.push(normalized)
        } catch (e) {
          errors.push(`第 ${chapterId} 章：YAML 格式错误 - ${(e as Error).message}`)
        }
      }

      setParseErrors(errors)
      if (errors.length > 0) {
        console.warn('YAML 解析警告:', errors)
      }
      
      setScripts(parsedScripts)
    } catch (error) {
      setParseErrors(['解析剧本数据失败'])
      console.error('Parse error:', error)
    }
  }, [])

  const handleExport = (script: ScriptData) => {
    const yamlStr = yaml.dump(script, { indent: 2, lineWidth: -1 })
    const blob = new Blob([yamlStr], { type: 'text/yaml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${script.script.title || '剧本'}.yaml`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('导出成功')
  }

  const getCharacterStats = (script: ScriptData) => {
    const stats: Record<string, { role: string; scenes: number; dialogues: number }> = {}
    for (const scene of script.script.scenes) {
      for (const char of scene.characters) {
        if (!stats[char.name]) stats[char.name] = { role: char.role, scenes: 0, dialogues: 0 }
        stats[char.name].scenes++
      }
      for (const dialogue of scene.dialogues) {
        if (!stats[dialogue.speaker]) stats[dialogue.speaker] = { role: '未知', scenes: 0, dialogues: 0 }
        stats[dialogue.speaker].dialogues++
      }
    }
    return Object.entries(stats).sort((a, b) => b[1].scenes - a[1].scenes).map(([name, data]) => ({ name, ...data }))
  }

  const characterColumns = [
    { title: '角色名', dataIndex: 'name', key: 'name' },
    { title: '角色类型', dataIndex: 'role', key: 'role' },
    { title: '出场场景', dataIndex: 'scenes', key: 'scenes' },
    { title: '对话次数', dataIndex: 'dialogues', key: 'dialogues' },
  ]

  return (
    <div className="preview-page">
      <div className="preview-header">
        <Title level={2}>剧本预览</Title>
        <Space>
          <Button onClick={() => navigate('/')} icon={<ArrowLeftOutlined />}>返回输入</Button>
          <Button onClick={() => navigate('/convert')} icon={<ArrowLeftOutlined />}>返回转换</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => scripts.forEach(s => handleExport(s))} disabled={scripts.length === 0}>导出全部</Button>
        </Space>
      </div>

      {parseErrors.length > 0 && scripts.length === 0 && (
        <Card title="转换结果（原始 YAML）" size="small" style={{ marginBottom: 16 }}>
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {Object.entries(rawResults).map(([chapterId, yamlStr]) => (
              <div key={chapterId}>
                <Tag color="orange">第 {chapterId} 章</Tag>
                <Text type="secondary"> 解析失败，显示原始 YAML</Text>
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', marginTop: 8 }}>
                  {yamlStr}
                </pre>
              </div>
            ))}
          </Space>
          <Text type="secondary" style={{ marginTop: 12, display: 'block' }}>
            提示：请返回 AI 转换页面重新转换，或检查 API 返回的 YAML 格式是否正确
          </Text>
        </Card>
      )}

      {scripts.length > 0 && (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={scripts.map((script, index) => ({
            key: String(index),
            label: script.script.title,
            children: (
              <div className="script-content">
                <Card title="YAML 源码" size="small" style={{ marginBottom: 16 }}>
                  <div style={{ maxHeight: 500, overflow: 'auto' }}>
                    <SyntaxHighlighter language="yaml" style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: 4 }}>
                      {yaml.dump(script, { indent: 2, lineWidth: -1 })}
                    </SyntaxHighlighter>
                  </div>
                  <Button type="link" icon={<DownloadOutlined />} onClick={() => handleExport(script)} style={{ marginTop: 8 }}>导出此章节</Button>
                </Card>

                <Card title="角色统计" size="small" style={{ marginBottom: 16 }}>
                  <Table dataSource={getCharacterStats(script)} columns={characterColumns} rowKey="name" size="small" pagination={false} />
                </Card>

                <Card title="场景列表" size="small">
                  {script.script.scenes.map((scene) => (
                    <div key={scene.scene_id} className="scene-item">
                      <div className="scene-header">
                        <Text strong>{scene.scene_id}</Text>
                        <Text type="secondary">{scene.location}</Text>
                        {scene.time && <Tag>{scene.time}</Tag>}
                      </div>
                      <div className="scene-dialogues">
                        {scene.dialogues.map((dialogue, idx) => (
                          <div key={idx} className="dialogue-item">
                            <Text strong style={{ color: '#1890ff' }}>{dialogue.speaker}</Text>
                            {dialogue.emotion && <Tag color="orange" style={{ marginLeft: 8 }}>{dialogue.emotion}</Tag>}
                            <div className="dialogue-content">{dialogue.content}</div>
                            {dialogue.action && <Text type="secondary" italic>[{dialogue.action}]</Text>}
                          </div>
                        ))}
                      </div>
                      {scene.narration && <Text type="secondary" italic>{scene.narration}</Text>}
                    </div>
                  ))}
                </Card>
              </div>
            ),
          }))}
        />
      )}
    </div>
  )
}

export default PreviewPage
