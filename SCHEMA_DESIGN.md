# AI 小说转剧本 YAML Schema 设计文档

> 版本: v1.0  
> 日期: 2026-06-06  
> 项目: 七牛云 × XEngineer 暑期实训营 第三批次 — 题目三

---

## 1. 设计目标

本 Schema 用于定义 AI 小说转剧本工具输出的结构化剧本格式，设计时遵循以下目标：

1. **结构化**：将非结构化小说文本转换为机器可读的结构化数据，便于后续处理、验证和二次编辑。
2. **可扩展**：支持后续添加更多字段（如镜头语言、音效、灯光设计等），不破坏已有结构。
3. **可验证**：通过 JSON Schema 验证确保 AI 输出格式正确，降低人工校对成本。
4. **可编辑**：YAML 格式天然适合人工阅读和修改，便于编剧在 AI 生成初稿后进行微调。

---

## 2. Schema 完整定义

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "剧本 YAML Schema",
  "description": "AI 小说转剧本工具输出的结构化剧本格式定义",
  "type": "object",
  "required": ["script"],
  "properties": {
    "script": {
      "type": "object",
      "required": ["title", "source_chapter", "scenes"],
      "properties": {
        "title": {
          "type": "string",
          "description": "剧本标题（通常为章节名）"
        },
        "source_chapter": {
          "type": "integer",
          "description": "原小说章节序号",
          "minimum": 1
        },
        "scenes": {
          "type": "array",
          "description": "场景列表",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["scene_id", "location", "characters"],
            "properties": {
              "scene_id": {
                "type": "string",
                "description": "场景唯一标识，格式如 S001",
                "pattern": "^S\\d{3}$"
              },
              "location": {
                "type": "string",
                "description": "场景地点"
              },
              "time": {
                "type": "string",
                "description": "场景时间（可选）"
              },
              "characters": {
                "type": "array",
                "description": "出场角色列表",
                "minItems": 1,
                "items": {
                  "type": "object",
                  "required": ["name", "role"],
                  "properties": {
                    "name": {
                      "type": "string",
                      "description": "角色名称"
                    },
                    "role": {
                      "type": "string",
                      "description": "角色类型",
                      "enum": ["主角", "配角", "龙套"]
                    }
                  }
                }
              },
              "dialogues": {
                "type": "array",
                "description": "对话列表",
                "items": {
                  "type": "object",
                  "required": ["speaker", "content"],
                  "properties": {
                    "speaker": {
                      "type": "string",
                      "description": "说话人"
                    },
                    "content": {
                      "type": "string",
                      "description": "对话内容"
                    },
                    "emotion": {
                      "type": "string",
                      "description": "情感标签（可选）"
                    },
                    "action": {
                      "type": "string",
                      "description": "伴随动作（可选）"
                    }
                  }
                }
              },
              "narration": {
                "type": "string",
                "description": "旁白或环境描写（可选）"
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 3. 输出示例

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
        - name: "店小二"
          role: "配角"
      dialogues:
        - speaker: "李逍遥"
          content: "小二，来两斤牛肉，一坛好酒。"
          emotion: "豪爽"
        - speaker: "店小二"
          content: "好嘞，客官稍等！"
          action: "转身跑向后厨"
      narration: "客栈内人声鼎沸，李逍遥找了个角落坐下。"
    - scene_id: "S002"
      location: "客栈后院"
      time: "夜晚"
      characters:
        - name: "李逍遥"
          role: "主角"
        - name: "神秘人"
          role: "配角"
      dialogues:
        - speaker: "神秘人"
          content: "你终于来了，我等你很久了。"
          emotion: "平静"
      narration: "月光洒在后院的青石板上，微风拂过竹林发出沙沙声。"
```

---

## 4. 核心字段设计理由

### 4.1 顶层结构

| 字段 | 类型 | 必填 | 设计理由 |
|------|------|------|---------|
| `script` | object | 是 | 统一顶层对象，避免 AI 输出结构不一致 |
| `script.title` | string | 是 | 标识剧本来源章节，去除"第X章"前缀，便于溯源和文件命名 |
| `script.source_chapter` | integer | 是 | 记录原章节序号，支持多章节独立转换后合并 |
| `script.scenes` | array | 是 | 场景列表，剧本的核心组织单元 |

### 4.2 场景结构

| 字段 | 类型 | 必填 | 设计理由 |
|------|------|------|---------|
| `scene_id` | string | 是 | 场景唯一标识，格式 `S001/S002/...`（固定3位数字），便于引用、排序和跳转 |
| `location` | string | 是 | 场景地点是剧本的核心要素，决定美术/场景设计 |
| `time` | string | 否 | 时间信息影响剧情节奏和灯光设计，但因部分场景时间不明确设为可选 |
| `characters` | array | 是 | 出场角色信息帮助编剧掌握人物关系和调度安排 |
| `dialogues` | array | 否 | 对话是剧本的核心内容，部分场景可能无对话 |
| `narration` | string | 否 | 保留必要的环境描写和旁白，辅助场景理解 |

### 4.3 角色结构

| 字段 | 类型 | 必填 | 设计理由 |
|------|------|------|---------|
| `name` | string | 是 | 角色名称 |
| `role` | string | 是 | 角色类型，限定为"主角/配角/龙套"三类，便于后续统计和分析 |

### 4.4 对话结构

| 字段 | 类型 | 必填 | 设计理由 |
|------|------|------|---------|
| `speaker` | string | 是 | 说话人，用于区分角色台词 |
| `content` | string | 是 | 对话内容，剧本最核心元素 |
| `emotion` | string | 否 | 情感标签（如愤怒/喜悦/悲伤），辅助演员表演指导 |
| `action` | string | 否 | 伴随动作，补充对话的肢体语言信息 |

---

## 5. 设计决策说明

### 5.1 为什么选择 YAML 而非 JSON 或纯文本？

| 格式 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **YAML** | 人类可读性极佳、天然支持注释、缩进清晰 | 解析稍复杂 | **选用** |
| JSON | 机器解析简单、生态成熟 | 嵌套括号多，人工编辑困难 | 仅作为验证中间格式 |
| Fountain | 剧本行业标准 | 依赖 Markdown 扩展、不适合结构化分析 | 未来可导出为目标格式 |

### 5.2 为什么场景放在 script 下而非顶层？

将 `scenes` 嵌套在 `script` 下而非放在顶层，是为了：
- 保持单一顶层对象，避免 AI 输出时遗漏或混淆
- 便于后续扩展（如同一 script 下可添加 `metadata`、`notes` 等字段）
- 符合 YAML 文档的最佳实践（单一根节点）

### 5.3 为什么 `characters` 放在每个 scene 下而非全局？

- 不同场景的出场角色不同，放在 scene 下更准确反映实际情况
- 便于按场景统计角色出场次数和调度安排
- 全局角色表可通过聚合各 scene 的 characters 自动生成

### 5.4 scene_id 为什么用字符串 `S001` 而非数字 `1`？

- 字符串格式便于排序（`S001 < S002 < S010`）
- 符合行业剧本编号习惯（Scene 1, Scene 2...）
- 固定 3 位数字保证最大支持 999 个场景，同时保持视觉对齐

### 5.5 为什么 `role` 只允许"主角/配角/龙套"三个枚举值？

- 简化 AI 判断难度，避免角色分类过细导致不一致
- 三个类别已足够满足剧本分析需求（主角推动主线、配角辅助、龙套填充场景）
- 未来可扩展为数组支持多标签（如 `["主角", "反派"]`）

---

## 6. 验证机制

### 6.1 验证流程

```
AI 输出 YAML → 解析为 JSON → AJV Schema 验证 → 返回验证结果
                                    ↓
                              验证失败 → 重试（最多3次）
                                    ↓
                              验证通过 → 返回最终剧本
```

### 6.2 验证规则

| 规则 | 说明 |
|------|------|
| 顶层必须包含 `script` 对象 | 保证结构一致性 |
| `script` 必须包含 `title`、`source_chapter`、`scenes` | 核心元数据不可缺失 |
| `scenes` 至少包含 1 个场景 | 空剧本无效 |
| 每个场景必须包含 `scene_id`、`location`、`characters` | 场景基本要素 |
| `scene_id` 必须符合 `^S\d{3}$` 格式 | 保证编号规范 |
| `characters` 至少包含 1 个角色 | 无角色场景无效 |
| `role` 必须是"主角/配角/龙套"之一 | 角色类型限定 |

### 6.3 容错处理

当 AI 输出不符合 Schema 时，系统会：
1. 尝试自动修复常见格式问题（引号转义、缩进修复、截断清理等）
2. 重新验证，若仍失败则最多重试 3 次
3. 若最终仍无法通过验证，将原始内容展示给用户并提示手动修复

---

## 7. 与行业标准对比

| 标准 | 本 Schema | 说明 |
|------|-----------|------|
| **Fountain** | 部分兼容 | Fountain 是基于 Markdown 的纯文本格式，本 Schema 是结构化数据，可互相转换 |
| **Final Draft (.fdx)** | 可转换 | YAML 结构化数据可转换为 FDX XML 格式 |
| **Celtx** | 可转换 | 结构化数据便于导入 Celtx 进行进一步编辑 |

---

## 8. 扩展性考虑

未来版本可扩展以下字段，不会破坏现有结构：

```yaml
# 场景级别扩展
scenes:
  - scene_id: "S001"
    camera: "特写/全景/中景"      # 镜头语言
    sound: "环境音/音效"          # 声音设计
    lighting: "日景/夜景"         # 灯光设计
    duration: "预计时长(秒)"      # 场景时长估算

# 对话级别扩展
dialogues:
  - speaker: "李逍遥"
    content: "你好"
    camera: "近景"               # 镜头建议
    volume: "正常/轻声/大声"      # 音量控制
    subtitle: "字幕翻译"          # 多语言支持

# 剧本级别扩展
script:
  metadata:
    genre: "武侠/都市/科幻"       # 类型标签
    target_audience: "青少年/成人" # 目标受众
    estimated_runtime: "90分钟"    # 预估时长
```

---

## 9. 版本管理

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-06-06 | 初始版本，定义基础剧本结构 |

---

**文档结束**