import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ConvertPage from './pages/ConvertPage'
import PreviewPage from './pages/PreviewPage'
import './App.css'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/convert" element={<ConvertPage />} />
            <Route path="/preview" element={<PreviewPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
