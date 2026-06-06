# AI 小说转剧本工具

> 七牛云 × XEngineer 暑期实训营 第三批次 — 题目三

输入小说文本，分钟级生成可编辑的结构化剧本初稿（YAML 格式）。

## 在线演示

[在线演示地址](待部署)

## 功能特性

| 功能 | 说明 |
|------|------|
| 多源输入 | 支持上传 `.txt` 文件（UTF-8）或直接粘贴文本 |
| 自动章节识别 | 智能识别中文章节（第X章）和英文章节（Chapter X） |
| AI 逐章转换 | 调用大模型 API 将每个章节转换为结构化剧本 |
| YAML 结构化输出 | 生成符合自定义 Schema 的 YAML 格式剧本 |
| Schema 验证 | 使用 AJV 自动验证输出格式，失败自动重试 |
| 可视化预览 | 支持剧本结构化展示，含场景列表、角色表、对话浏览 |
| 数据统计 | 场景总数、角色统计、对话统计、地点分布、情感分析 |
| 图表展示 | 角色出场柱状图、场景地点饼图、情感分布饼图 |
| 导出下载 | 支持单章 YAML 导出和多章节 ZIP 打包下载 |
| 文本清洗 | 自动清理空行、Markdown 格式标记、游戏数值等噪声 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 克隆仓库
git clone <your-repo-url>
cd AI_Novel_new

# 安装依赖
npm install

# 配置环境变量（复制模板并填写你的 API Key）
cp .env.example .env

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:5173` 即可使用。

### 环境变量配置

在 `.env` 文件中配置以下变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_AI_API_KEY` | AI API 密钥 | 无 |
| `VITE_AI_API_URL` | AI API 地址 | 智谱 GLM 默认地址 |
| `VITE_AI_MODEL` | 模型名称 | `glm-4` |

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | React 19 + TypeScript | 组件开发与类型安全 |
| 构建工具 | Vite | 快速开发与构建 |
| UI 组件 | Ant Design 6 | 界面组件库 |
| 图表库 | @ant-design/charts | 数据可视化 |
| YAML 处理 | js-yaml | YAML 解析与生成 |
| Schema 验证 | AJV | JSON Schema 验证 |
| 代码高亮 | react-syntax-highlighter | YAML 语法高亮 |
| 路由 | react-router-dom | 页面导航 |
| 文件导出 | file-saver + JSZip | 文件下载与 ZIP 打包 |
| AI 引擎 | 通义千问 / 智谱 GLM | 大模型 API 调用 |

## 项目结构

```
AI_Novel_new/
├── public/
│   └── data/
│       └── test-novel.txt          # 测试用小说样本
├── src/
│   ├── components/
│   │   ├── Layout.tsx              # 全局布局组件
│   │   └── Layout.css
│   ├── pages/
│   │   ├── HomePage.tsx            # 小说输入页面
│   │   ├── ConvertPage.tsx         # AI 转换页面
│   │   └── PreviewPage.tsx         # 剧本预览页面
│   ├── services/
│   │   ├── AIService.ts            # AI API 调用与 YAML 容错
│   │   ├── PromptBuilder.ts        # Prompt 模板构建
│   │   ├── SchemaValidator.ts      # Schema 验证模块
│   │   └── TextCleaner.ts          # 文本清洗模块
│   ├── schemas/
│   │   └── script.schema.json      # 剧本 YAML Schema 定义
│   ├── App.tsx                     # 应用入口
│   └── main.tsx                    # React 挂载点
├── SCHEMA_DESIGN.md                # Schema 设计文档（参赛要求）
├── .env.example                    # 环境变量模板
├── package.json
└── vite.config.ts
```

## 使用流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. 输入小说  │────▶│  2. 章节分割  │────▶│  3. AI 转换   │────▶│  4. 预览导出  │
│  上传/粘贴    │     │  自动识别     │     │  逐章处理     │     │  YAML 下载    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **输入小说**：上传 `.txt` 文件或粘贴文本内容
2. **章节分割**：系统自动识别章节并显示章节列表
3. **AI 转换**：逐章调用 AI 转换为 YAML 剧本，实时显示进度
4. **预览导出**：查看结构化剧本、统计图表，支持单章或打包下载

## YAML Schema

剧本输出的 YAML Schema 定义在 `src/schemas/script.schema.json`，设计说明详见 [SCHEMA_DESIGN.md](./SCHEMA_DESIGN.md)。

### 输出示例

```yaml
script:
  title: "初入江湖"
  source_chapter: 1
  scenes:
    - scene_id: "S001"
      location: "客栈大厅"
      time: "傍晚"
      characters:
        - name: "李逍遥"
          role: "主角"
      dialogues:
        - speaker: "李逍遥"
          content: "小二，来两斤牛肉，一坛好酒。"
          emotion: "豪爽"
```

## 构建与部署

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

构建产物位于 `dist/` 目录，可部署到 Vercel、GitHub Pages 等静态托管平台。

## 参赛材料

- [产品需求文档 (PRD.md)](../PRD.md)
- [YAML Schema 设计文档 (SCHEMA_DESIGN.md)](./SCHEMA_DESIGN.md)
- [测试用小说样本](../小说测试样本.md)

## License

本项目为七牛云 × XEngineer 暑期实训营参赛作品，仅供学习交流使用。