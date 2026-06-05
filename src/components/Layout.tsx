import React from 'react'
import { Layout as AntLayout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { FileText, ConversionOutlined, EyeOutlined } from '@ant-design/icons'
import './Layout.css'

const { Header, Content, Footer } = AntLayout

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { key: '/', icon: <FileText />, label: '小说输入' },
    { key: '/convert', icon: <ConversionOutlined />, label: 'AI 转换' },
    { key: '/preview', icon: <EyeOutlined />, label: '剧本预览' },
  ]

  return (
    <AntLayout className="app-layout">
      <Header className="app-header">
        <div className="logo"><h1>AI 小说转剧本工具</h1></div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="app-menu"
        />
      </Header>
      <Content className="app-content">{children}</Content>
      <Footer className="app-footer">
        AI 小说转剧本工具 &copy; {new Date().getFullYear()} 七牛云 × XEngineer 暑期实训营
      </Footer>
    </AntLayout>
  )
}

export default Layout
