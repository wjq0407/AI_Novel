import React, { useState, useEffect } from 'react'
import { Card, Button, Steps, Typography, message, Space, Tag } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { callAIForConversion } from '../services/AIService'
import './ConvertPage.css'

const { Title, Text, Paragraph } = Typography

const ConvertPage: React.FC = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [chapters, setChapters] = useState<{ id: number; title: string; content: string }[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [conversionComplete, setConversionComplete] = useState(false)
  const [conversionResults, setConversionResults] = useState<Record<number, string>>({})

  useEffect(() => {
    const content = sessionStorage.getItem('novelContent')
    if (!content) { message.warning('请先输入小说文本'); navigate('/'); return }
    setChapters(splitIntoChapters(content))
  }, [navigate])

  const splitIntoChapters = (content: string): { id: number; title: string; content: string }[] => {
    const patterns = [/^第[一二三四五六七八九十\d]+[章节回].*/gm, /^Chapter\s+\d+.*/gmi]
    let markers: { index: number; title: string }[] = []
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) markers.push({ index: match.index, title: match[0].trim() })
    }
    markers.sort((a, b) => a.index - b.index)
    const uniqueMarkers: { index: number; title: string }[] = []
    for (const marker of markers) {
      if (uniqueMarkers.length === 0 || Math.abs(marker.index - uniqueMarkers[uniqueMarkers.length - 1].index) > 50) {
        uniqueMarkers.push(marker)
      }
    }
    if (uniqueMarkers.length === 0) return [{ id: 1, title: '全文', content }]
    return uniqueMarkers.map((marker, idx) => ({
      id: idx + 1,
      title: marker.title,
      content: content.slice(marker.index, idx < uniqueMarkers.length - 1 ? uniqueMarkers[idx + 1].index : content.length).trim(),
    }))
  }

  const handleConvert = async () => {
    setIsConverting(true)
    setCurrentStep(1)
    try {
      const results: Record<number, string> = {}
      for (const chapter of chapters) {
        setCurrentStep(2)
        results[chapter.id] = await callAIForConversion(chapter.content, chapter.id)
      }
      setConversionResults(results)
      setConversionComplete(true)
      setCurrentStep(3)
      sessionStorage.setItem('conversionResults', JSON.stringify(results))
      message.success('转换完成！')
    } catch (error) {
      message.error('转换失败，请重试')
      console.error('Conversion error:', error)
    } finally {
      setIsConverting(false)
    }
  }

  const handlePreview = () => navigate('/preview')

  const steps = [
    { title: '章节识别', description: `识别到 ${chapters.length} 个章节` },
    { title: 'AI 转换', description: isConverting ? '正在转换中...' : '准备转换' },
    { title: '生成结果', description: conversionComplete ? '转换完成' : '等待转换' },
  ]

  return (
    <div className="convert-page">
      <Title level={2}>AI 剧本转换</Title>
      <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

      <Card title="识别到的章节" size="small" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {chapters.map((ch) => (
            <div key={ch.id} className="chapter-item">
              <Tag color="blue">第 {ch.id} 章</Tag>
              <Text strong>{ch.title}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>{ch.content.length} 字</Text>
            </div>
          ))}
          {chapters.length === 0 && <Text type="secondary">正在分析文本...</Text>}
        </Space>
      </Card>

      <Card title="转换设置" size="small">
        <Paragraph><Text>将使用 AI 逐章将小说转换为结构化剧本（YAML 格式）</Text></Paragraph>
        <Space>
          <Button onClick={() => navigate('/')} icon={<ArrowLeftOutlined />}>返回</Button>
          <Button type="primary" onClick={handleConvert} loading={isConverting} disabled={chapters.length === 0 || conversionComplete} icon={<ArrowRightOutlined />}>
            {conversionComplete ? '转换完成' : '开始转换'}
          </Button>
          {conversionComplete && <Button type="primary" onClick={handlePreview}>查看预览</Button>}
        </Space>
      </Card>

      {conversionComplete && (
        <Card title="转换结果" size="small" style={{ marginTop: 24 }}>
          {Object.entries(conversionResults).map(([chapterId, yaml]) => (
            <div key={chapterId} style={{ marginBottom: 16 }}>
              <Tag color="green">第 {chapterId} 章</Tag>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>{yaml}</pre>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

export default ConvertPage
