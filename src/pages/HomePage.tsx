import React, { useState } from 'react'
import { Card, Upload, Button, Input, Typography, message, Row, Col, Alert } from 'antd'
import { InboxOutlined, ArrowRightOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { UploadFile } from 'antd/es/upload/interface'
import { cleanText, getCleaningSummary } from '../services/TextCleaner'
import './HomePage.css'

const { Dragger } = Upload
const { TextArea } = Input
const { Title, Text } = Typography

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [textContent, setTextContent] = useState<string>('')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [cleaningInfo, setCleaningInfo] = useState<string>('')

  // File reading is handled by customUpload

  const handleNext = () => {
    if (!textContent.trim()) {
      message.warning('请先输入或上传小说文本')
      return
    }
    // 清洗文本（包括粘贴的文本）
    const { text, stats } = cleanText(textContent)
    const summary = getCleaningSummary(stats)
    if (summary !== '文本无需清洗') {
      setCleaningInfo(summary)
    }
    sessionStorage.setItem('novelContent', text)
    navigate('/convert')
  }

  const customUpload = (options: any) => {
    const { file, onSuccess, onError } = options
    const reader = new FileReader()
    reader.onload = (e) => {
      const rawText = e.target?.result as string
      const { text, stats } = cleanText(rawText)
      setTextContent(text)
      setCleaningInfo(getCleaningSummary(stats))
      message.success(`文件 "${(file as File).name}" 读取并清洗成功`)
      onSuccess?.('ok')
    }
    reader.onerror = () => {
      message.error('文件读取失败，请确保文件编码为 UTF-8')
      onError?.(new Error('文件读取失败'))
    }
    reader.readAsText(file as File, 'UTF-8')
  }

  const uploadProps = {
    accept: '.txt',
    maxCount: 1,
    customRequest: customUpload,
    beforeUpload: (file: File) => {
      if (file.size > 10 * 1024 * 1024) { message.error('文件大小不能超过 10MB'); return false }
      if (!file.name.endsWith('.txt')) { message.error('仅支持 .txt 格式文件'); return false }
      return true
    },
    onChange: (info: { file: UploadFile }) => {
      if (info.file.status === 'done') {
        setFileList([info.file])
      }
    },
  }

  return (
    <div className="home-page">
      <Title level={2}>输入小说文本</Title>
      <Text type="secondary">支持上传 .txt 文件或直接粘贴文本内容，系统将自动识别章节并转换为剧本</Text>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="文件上传" size="small">
            <Dragger {...uploadProps} fileList={fileList}>
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p>点击或拖拽文件到此区域</p>
              <p className="ant-upload-hint">支持 .txt 格式，大小不超过 10MB，UTF-8 编码</p>
            </Dragger>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="文本粘贴" size="small">
            {cleaningInfo && (
              <Alert
                title={cleaningInfo}
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                closable
                style={{ marginBottom: 12 }}
                onClose={() => setCleaningInfo('')}
              />
            )}
            <TextArea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="在此粘贴小说文本内容..."
              autoSize={{ minRows: 12, maxRows: 20 }}
              style={{ marginBottom: 12 }}
            />
            {textContent && <Text type="secondary">已输入 {textContent.length} 字</Text>}
          </Card>
        </Col>
      </Row>

      <div className="home-actions">
        <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={handleNext} disabled={!textContent.trim()}>
          下一步：章节分割与转换
        </Button>
      </div>
    </div>
  )
}

export default HomePage
