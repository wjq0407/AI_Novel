import React, { useState, useEffect } from 'react'
import { Card, Tabs, Typography, Button, message, Space, Table, Tag, Row, Col, Statistic } from 'antd'
import { DownloadOutlined, ArrowLeftOutlined, FileTextOutlined, TeamOutlined, MessageOutlined, BarChartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import * as yaml from 'js-yaml'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Column, Pie } from '@ant-design/charts'
import './PreviewPage.css'

const { Title, Text } = Typography

interface SceneCharacter { name: string; role: string }
interface Dialogue { speaker: string; content: string; emotion?: string; action?: string }
interface Scene { scene_id: string; location: string; time?: string; characters: SceneCharacter[]; dialogues: Dialogue[]; narration?: string }
interface ScriptData { script: { title: string; source_chapter: number; scenes: Scene[] } }

// Normalize title: remove chapter prefix like "第X章" or "Chapter X"
function normalizeTitle(title: string, chapterId: number): string {
  // Remove patterns like "第X章 ", "第一章 ", "Chapter 1 " etc.
  return title
    .replace(/^第[一二三四五六七八九十\d]+[章节回]\s*/, '')
    .replace(/^Chapter\s+\d+\s*/i, '')
    .trim() || `第 ${chapterId} 章`
}

// Fallback: normalize AI output that uses different field names
function normalizeScript(data: any, chapterId: number): ScriptData {
  // Case 1: Correct format (script.scenes)
  if (data?.script?.scenes) {
    const normalizedTitle = normalizeTitle(data.script.title || '', chapterId)
    return { ...data, script: { ...data.script, title: normalizedTitle, scenes: data.script.scenes || [], source_chapter: chapterId } } as ScriptData
  }
  
  // Case 2: AI returns { title, characters, scenes } at root level
  if (data?.scenes) {
    const normalizedTitle = normalizeTitle(data.title || '', chapterId)
    const normalizedScenes = data.scenes.map((s: any, i: number) => ({
      scene_id: typeof s.scene_id === 'string' ? s.scene_id : `S${String(s.scene_id || s.scene || i + 1).padStart(3, '0')}`,
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
        title: normalizedTitle,
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

  const handleExport = async (script: ScriptData) => {
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

  const handleExportAllZip = async () => {
    if (scripts.length === 0) return
    const zip = new JSZip()
    const folder = zip.folder('剧本')!
    for (const script of scripts) {
      const yamlStr = yaml.dump(script, { indent: 2, lineWidth: -1 })
      const fileName = `${script.script.title || `第${script.script.source_chapter}章`}.yaml`
      folder.file(fileName, yamlStr)
    }
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, '剧本全集.zip')
    message.success(`已将 ${scripts.length} 个章节打包为 ZIP 文件`)
  }

  const getCharacterStats = (script: ScriptData) => {
    const stats: Record<string, { role: string; scenes: number; dialogues: number }> = {}
    for (const scene of script.script.scenes) {
      for (const char of scene.characters) {
        if (!stats[char.name]) stats[char.name] = { role: char.role, scenes: 0, dialogues: 0 }
        stats[char.name].scenes++
      }
      for (const dialogue of scene.dialogues || []) {
        if (!stats[dialogue.speaker]) stats[dialogue.speaker] = { role: '未知', scenes: 0, dialogues: 0 }
        stats[dialogue.speaker].dialogues++
      }
    }
    return Object.entries(stats).sort((a, b) => b[1].scenes - a[1].scenes).map(([name, data]) => ({ name, ...data }))
  }

  // 获取场景地点分布数据
  const getLocationStats = (script: ScriptData) => {
    const stats: Record<string, number> = {}
    for (const scene of script.script.scenes) {
      const location = scene.location || '未知'
      stats[location] = (stats[location] || 0) + 1
    }
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .map(([location, value]) => ({ type: location, value }))
  }

  // 获取角色出场柱状图数据（扁平化格式用于分组柱状图）
  const getCharacterChartData = (script: ScriptData) => {
    const charStats = getCharacterStats(script)
    const data: { name: string; type: string; value: number }[] = []
    charStats.forEach((c: any) => {
      data.push({ name: c.name, type: '出场场景', value: c.scenes })
      data.push({ name: c.name, type: '对话次数', value: c.dialogues })
    })
    return data
  }

  // 获取情感分布数据
  const getEmotionStats = (script: ScriptData) => {
    const stats: Record<string, number> = {}
    for (const scene of script.script.scenes) {
      for (const dialogue of scene.dialogues || []) {
        if (dialogue.emotion) {
          stats[dialogue.emotion] = (stats[dialogue.emotion] || 0) + 1
        }
      }
    }
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) // 只显示前8种情感
      .map(([type, value]) => ({ type, value }))
  }

  const characterColumns = [
    { title: '角色名', dataIndex: 'name', key: 'name' },
    { title: '角色类型', dataIndex: 'role', key: 'role' },
    { title: '出场场景', dataIndex: 'scenes', key: 'scenes' },
    { title: '对话次数', dataIndex: 'dialogues', key: 'dialogues' },
  ]

  // 柱状图配置
  const columnChartConfig = (script: ScriptData) => ({
    data: getCharacterChartData(script),
    isGroup: true,
    xField: 'name',
    yField: 'value',
    seriesField: 'type',
    color: ['#1890ff', '#52c41a'],
    label: {
      position: 'top' as const,
      layout: [
        { type: 'interval-adjust-position' as const },
        { type: 'interval-hide-overlap' as const }
      ]
    },
    interactions: [{ type: 'active-region' as const }],
    legend: { position: 'top' as const },
    xAxis: {
      label: {
        autoRotate: true,
        autoHide: { type: 'equidistance' as const, configuration: { minGap: 6 } }
      }
    },
    yAxis: { title: { text: '数量' } },
    height: 300,
  })

  // 饼图配置
  const pieChartConfig = (data: any[]) => ({
    data,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: false,
    interactions: [{ type: 'element-active' as const }],
    legend: { position: 'right' as const },
    height: 280,
  })

  return (
    <div className="preview-page">
      <div className="preview-header">
        <Title level={2}>剧本预览</Title>
        <Space>
          <Button onClick={() => navigate('/')} icon={<ArrowLeftOutlined />}>返回输入</Button>
          <Button onClick={() => navigate('/convert')} icon={<ArrowLeftOutlined />}>返回转换</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportAllZip} disabled={scripts.length === 0}>打包导出 (ZIP)</Button>
        </Space>
      </div>

      {parseErrors.length > 0 && (
        <Card title="转换结果" size="small" style={{ marginBottom: 16 }}>
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {Object.entries(rawResults).map(([chapterId, yamlStr]) => {
              const error = parseErrors.find(e => e.startsWith(`第 ${chapterId} 章`))
              return (
                <div key={chapterId}>
                  <Tag color={error ? 'orange' : 'green'}>第 {chapterId} 章</Tag>
                  {error ? (
                    <>
                      <Text type="secondary"> 解析失败</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{error}</Text>
                      </div>
                    </>
                  ) : (
                    <Text type="secondary"> 解析成功</Text>
                  )}
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#1890ff', fontSize: 12 }}>查看原始 YAML</summary>
                    <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto', marginTop: 8 }}>
                      {yamlStr}
                    </pre>
                  </details>
                </div>
              )
            })}
          </Space>
          {scripts.length === 0 && (
            <Text type="secondary" style={{ marginTop: 12, display: 'block' }}>
              提示：请返回 AI 转换页面重新转换，或检查 API 返回的 YAML 格式是否正确
            </Text>
          )}
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
                {/* 核心指标卡片 */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={12} sm={6}>
                    <Card size="small" className="stat-card">
                      <Statistic
                        title="场景总数"
                        value={script.script.scenes.length}
                        prefix={<FileTextOutlined />}
                        styles={{ content: { color: '#1890ff' } }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small" className="stat-card">
                      <Statistic
                        title="角色总数"
                        value={getCharacterStats(script).length}
                        prefix={<TeamOutlined />}
                        styles={{ content: { color: '#52c41a' } }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small" className="stat-card">
                      <Statistic
                        title="对话总数"
                        value={script.script.scenes.reduce((sum, s) => sum + (s.dialogues?.length || 0), 0)}
                        prefix={<MessageOutlined />}
                        styles={{ content: { color: '#faad14' } }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small" className="stat-card">
                      <Statistic
                        title="场景地点"
                        value={new Set(script.script.scenes.map(s => s.location)).size}
                        prefix={<BarChartOutlined />}
                        styles={{ content: { color: '#722ed1' } }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 可视化图表区域 */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={24} md={12}>
                    <Card title="角色出场统计" size="small">
                      <Column {...columnChartConfig(script)} />
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="场景地点分布" size="small">
                      <Pie {...pieChartConfig(getLocationStats(script))} />
                    </Card>
                  </Col>
                </Row>

                {/* 情感分布（如果有数据） */}
                {getEmotionStats(script).length > 0 && (
                  <Card title="对话情感分布" size="small" style={{ marginBottom: 16 }}>
                    <div style={{ height: 280, display: 'flex', justifyContent: 'center' }}>
                      <Pie {...pieChartConfig(getEmotionStats(script))} />
                    </div>
                  </Card>
                )}

                {/* YAML 源码 */}
                <Card title="YAML 源码" size="small" style={{ marginBottom: 16 }}>
                  <div style={{ maxHeight: 500, overflow: 'auto' }}>
                    <SyntaxHighlighter language="yaml" style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: 4 }}>
                      {yaml.dump(script, { indent: 2, lineWidth: -1 })}
                    </SyntaxHighlighter>
                  </div>
                  <Button type="link" icon={<DownloadOutlined />} onClick={() => handleExport(script)} style={{ marginTop: 8 }}>导出此章节</Button>
                </Card>

                {/* 角色统计表格 */}
                <Card title="角色详细数据" size="small" style={{ marginBottom: 16 }}>
                  <Table dataSource={getCharacterStats(script)} columns={characterColumns} rowKey="name" size="small" pagination={false} />
                </Card>

                {/* 场景列表 */}
                <Card title="场景列表" size="small">
                  {(script.script.scenes || []).map((scene) => (
                    <div key={scene.scene_id} className="scene-item">
                      <div className="scene-header">
                        <Text strong>{scene.scene_id}</Text>
                        <Text type="secondary">{scene.location}</Text>
                        {scene.time && <Tag>{scene.time}</Tag>}
                      </div>
                      <div className="scene-dialogues">
                        {(scene.dialogues || []).map((dialogue, idx) => (
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
