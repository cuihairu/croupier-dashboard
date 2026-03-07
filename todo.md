# 编排 UI 企业级可用化 TODO

本文档面向 `croupier-dashboard` 当前“对象工作台 / 编排 UI”改造，目标不是继续堆原型能力，而是把现有半成品收敛成一套可以上线、可以维护、可以治理的企业级 V1。

## 0. 执行进度

### 2026-03-07（已完成）

- [x] 前端 `WorkspaceConfig` 补充 `status`、`version` 字段（TASK-001 部分完成）
- [x] `src/services/api/workspace.ts` 改为兼容层，统一委托到 `src/services/workspaceConfig.ts`（TASK-004）
- [x] 修复发布/取消发布后列表回填错误，改为操作后重新加载配置列表（TASK-005）
- [x] `WorkspaceEditor` 视图模式移除节点编辑入口，仅保留设计/预览模式（TASK-011 部分完成）
- [x] `TabEditor` 布局类型下拉限制为 `form-detail/list/form/detail`（TASK-011 部分完成）
- [x] `WorkspaceRenderer` 顶层运行时收敛为 `tabs`，其他类型统一报不在 V1 支持范围（TASK-016）
- [x] `LayoutDesigner` 增加顶层非 `tabs` 的转换提示与一键修正（TASK-011 部分完成）
- [x] `TabEditor` 移除 `grid/kanban/timeline/split` 配置分支，避免编辑器继续产出非 V1 布局（TASK-013 部分完成）
- [x] `WorkspaceEditor` 保存动作接入 `validateWorkspaceConfig`，保存前阻断非法配置（TASK-015 部分完成）
- [x] `validateWorkspaceConfig` 增强为布局级字段校验（tabs 顶层约束 + 各布局关键字段必填）（TASK-015 部分完成）
- [x] `LayoutDesigner` 增加 Tab 上下移动能力（TASK-012 部分完成）
- [x] `TabEditor` 增加 `defaultActive` 开关，`LayoutDesigner` 保证唯一默认页（TASK-012 部分完成）
- [x] `TabContentRenderer` 运行时分发收敛为 `form-detail/list/form/detail`，其余类型统一报 V1 不支持（TASK-018 部分完成）
- [x] `WorkspaceEditor` 模板应用增加 V1 范围校验，拦截非 `tabs + form-detail/list/form/detail` 模板（TASK-013/TASK-015 关联完成）
- [x] `Console/Detail` 与 `Workspaces/Detail` 统一为 `WorkspaceRenderer(config, loading, error)` 调用方式，收平运行时行为（TASK-019 部分完成）
- [x] 修正 `validateWorkspaceConfig` 与当前编辑器能力不一致的问题（detail/form-detail 校验调整），避免可选布局无法保存（TASK-015 一致性修复）
- [x] `Workspaces/index` 增加搜索、状态筛选、排序与无结果提示，提升列表可运营性（TASK-008 部分完成）
- [x] `Console/index` 增加搜索、排序与无结果提示，提升已发布工作台入口可用性（TASK-009 部分完成）
- [x] `TabEditor` 移除函数时联动清理 `listFunction/queryFunction/submitFunction/detailFunction`，避免悬空引用（TASK-013 部分完成）
- [x] `WorkspaceEditor` 保存校验失败改为错误列表弹窗，降低配置调试成本（TASK-015 部分完成）
- [x] `LayoutDesigner` 新增 Tab 默认页合法性保障（新增首个 Tab 自动默认、删除后自动补默认）(TASK-012 部分完成)
- [x] 工作台/控制台列表接入 `status/version` 展示，提升版本治理可见性（TASK-008/TASK-009 部分完成）
- [x] `TabEditor` 切换布局类型时自动基于已选函数生成初始字段/分区，降低空壳配置概率（TASK-013 部分完成）
- [x] `workspaceConfig` 增加版本列表/回滚 service 基础能力（前端预留，待后端接口联调）（TASK-021/TASK-022 前置完成）
- [x] `WorkspaceEditor` 增加版本历史 Drawer（列表、刷新、回滚操作、失败降级提示）（TASK-023 部分完成）
- [x] `services/api/workspace` 兼容层补齐 `listWorkspaceVersions/rollbackWorkspaceVersion` 转发（TASK-004 一致性补齐）
- [x] `access.ts` 增加 `workspace read/edit/publish/rollback/delete` 权限位，`canWorkspaceManage` 基于颗粒权限聚合（TASK-024 前置完成）
- [x] `Workspaces/index`、`WorkspaceEditor` 关键操作按钮接入权限控制（编辑/发布/回滚）（TASK-026 部分完成）
- [x] `Workspaces/Detail` 的“编辑配置”按钮接入 `canWorkspaceEdit`（TASK-026 部分完成）
- [x] 版本回滚确认增强（目标版本摘要 + 当前版本提示 + 覆盖风险提示），版本列表补结构摘要（TASK-023 部分完成）
- [x] 版本面板增加“与当前草稿差异摘要”（状态/布局/标签页数），支持回滚前快速评估影响（TASK-036/TASK-037 前置完成）
- [x] `Workspaces/index` 支持 `archived` 筛选，归档状态禁用编辑/发布操作（TASK-024/TASK-026 细化完成）
- [x] `Workspaces/index` 的发布/取消发布增加确认弹窗与摘要信息（对象/标题/标签页数），降低误操作风险（TASK-037/TASK-038 前置完成）
- [x] 重整 `README.md`：统一为当前 V1 能力说明，新增 Mermaid graph（系统关系、模块关系、配置流转、版本回滚链路）
- [x] 新增 `workspace` 埋点骨架（`services/workspace/telemetry.ts`），并接入保存/发布/取消发布/模板应用/版本加载/回滚关键动作（TASK-027 前端骨架完成）

## 1. 目标定义

### 1.1 V1 交付目标

本阶段只交付“对象工作台配置平台”，不交付真正的流程执行引擎。

必须实现的能力：

- 可创建对象工作台
- 可编辑基础布局
- 可保存草稿
- 可预览运行效果
- 可发布到控制台
- 可查看历史版本
- 可回滚到历史版本
- 可做权限控制
- 可做审计留痕
- 可做基础自动化测试

### 1.2 当前项目真实问题

当前代码状态的核心问题：

- `WorkspaceEditor` 可视能力多，但很多能力没有运行时闭环
- `WorkspaceRenderer` 只实现了部分布局，编辑器暴露能力大于渲染器支持能力
- `VisualNodeEditor` 当前不是“真实可执行编排”，只是 UI 层节点映射
- `workspace` 有重复 service 和契约漂移问题
- 发布、取消发布后的前端状态更新逻辑存在数据破坏风险
- 控制台访问、编辑器预览、工作台配置没有完全共享同一套运行模型

因此，V1 的策略必须是：

- 先收敛模型
- 先打通闭环
- 先隐藏未实现功能
- 再做治理能力

## 2. 总体实施原则

### 2.1 产品原则

- V1 定位为“对象工作台配置平台”
- 不把“流程节点编排”纳入 V1 承诺
- 所有页面不允许继续暴露“能点但不会生效”的假能力

### 2.2 技术原则

- KISS：优先保证主链路可靠，不做额外复杂抽象
- YAGNI：未闭环功能直接隐藏，不做未来能力预埋
- DRY：只保留一套 `workspace` 契约和一套 service
- SOLID：编辑器、渲染器、服务层、版本治理、审计分别承担单一职责

### 2.3 V1 支持范围

V1 只支持以下布局能力：

- 顶层布局：`tabs`
- tab 内布局：
  - `list`
  - `form`
  - `detail`
  - `form-detail`

V1 暂不支持以下能力：

- `sections`
- `wizard`
- `dashboard`
- `chart`
- `custom`
- 真正的条件分支执行
- 数据转换节点执行
- 节点图流程执行引擎

## 3. 任务拆解总览

任务分为 7 个 Epic：

- EPIC-1：模型收敛
- EPIC-2：API 与数据闭环
- EPIC-3：页面与编辑器可用化
- EPIC-4：渲染器重构
- EPIC-5：版本、发布、权限、审计
- EPIC-6：测试与回归
- EPIC-7：企业增强能力

---

## EPIC-1：模型收敛

目标：统一前后端 `workspace` 领域模型，消除字段漂移和解释歧义。

### TASK-001 统一 WorkspaceConfig 单一真相模型

#### 范围

- 统一前端 `src/types/workspace.ts`
- 统一后端 `../croupier/services/server/modules/workspace.api`
- 统一运行时真实使用字段

#### 字段清单

- `objectKey`
- `title`
- `description`
- `layout`
- `published`
- `publishedAt`
- `publishedBy`
- `menuOrder`
- `meta`
- `version`
- `status`

#### 子任务

- [ ] 梳理前端现有 `WorkspaceConfig` 字段
- [ ] 梳理后端现有 `WorkspaceConfig` 字段
- [ ] 列出差异字段清单
- [ ] 确认 `description` 是否纳入后端正式字段
- [ ] 确认 `version` 和 `status` 的正式定义
- [ ] 输出统一字段表
- [ ] 修改前端类型定义
- [ ] 修改后端 API 定义
- [ ] 确认返回示例 JSON

#### 产出

- 一份统一字段表
- 修改后的前后端类型定义

#### 验收标准

- 前后端字段一一对应
- 前端展示字段都有后端来源
- 不存在“页面可显示但服务端不存储”的字段

### TASK-002 定义配置状态机

#### 范围

定义工作台配置从创建到发布到回滚的生命周期。

#### 子任务

- [ ] 定义 `draft / published / archived` 状态
- [ ] 定义“保存草稿”状态转换
- [ ] 定义“发布”状态转换
- [ ] 定义“取消发布”状态转换
- [ ] 定义“回滚”状态转换
- [ ] 定义“删除”规则
- [ ] 明确草稿与发布版是否并行存在

#### 产出

- 状态机说明
- 状态转换表

#### 验收标准

- 前端页面、后端接口、数据库语义一致
- 同一个动作不会在不同页面有不同解释

### TASK-003 清理无效字段和假能力

#### 子任务

- [ ] 删除或隐藏未落地字段输入项
- [ ] 删除或隐藏不会生效的按钮
- [ ] 删除或隐藏与 V1 范围不符的布局入口
- [ ] 删除或隐藏伪编排节点入口

#### 验收标准

- 页面上不再出现“填了也不生效”的能力

---

## EPIC-2：API 与数据闭环

目标：只保留一套可维护的 `workspace` 数据访问层，并保证工作台列表、编辑器、控制台共享同一契约。

### TASK-004 合并重复 Workspace Service

#### 现状

当前存在两套相关实现：

- `src/services/workspaceConfig.ts`
- `src/services/api/workspace.ts`

#### 子任务

- [ ] 梳理两套 service 的职责差异
- [ ] 确定保留的单一 service 入口
- [ ] 统一命名规则
- [ ] 统一请求/响应结构
- [ ] 替换页面中的历史引用
- [ ] 删除冗余 service 或标记废弃

#### 验收标准

- 所有页面只依赖一套 `workspace` service
- 不再存在重复 API 语义

### TASK-005 修复发布/取消发布后的状态更新逻辑

#### 问题

当前发布接口返回值不是完整配置对象，前端直接替换列表项会破坏已有数据。

#### 子任务

- [ ] 检查发布接口真实响应
- [ ] 检查取消发布接口真实响应
- [ ] 改为局部 merge 或重新获取详情
- [ ] 保证列表页状态同步正确
- [ ] 保证控制台首页刷新后状态正确

#### 验收标准

- 发布后不会丢失 `title`、`description`、`layout` 等字段
- 发布状态更新正确

### TASK-006 对齐前端入口与后端真实能力

#### 子任务

- [ ] 核对 `clone` 是否后端支持
- [ ] 核对 `import` 是否后端支持
- [ ] 核对 `export` 是否后端支持
- [ ] 核对 `version list` 是否后端支持
- [ ] 核对 `rollback` 是否后端支持
- [ ] 未实现接口先移除前端入口
- [ ] 已实现接口统一到正式 service

#### 验收标准

- 前端不存在“调用后端没有的接口”
- 所有可点击入口都能命中真实能力

### TASK-007 统一错误码与错误消息

#### 子任务

- [ ] 约定 `workspace` 相关错误码
- [ ] 约定统一错误结构
- [ ] 补齐“配置不存在”错误
- [ ] 补齐“配置非法”错误
- [ ] 补齐“无权限”错误
- [ ] 补齐“发布失败”错误
- [ ] 补齐“版本不存在”错误
- [ ] 前端统一错误提示文案

#### 验收标准

- 所有异常场景都有清晰提示
- 用户能知道是“没权限、没数据、还是配置错误”

---

## EPIC-3：页面与编辑器可用化

目标：让工作台列表、控制台、编辑器成为一条稳定主链路。

### TASK-008 重构工作台列表页

#### 页面

- `src/pages/Workspaces/index.tsx`

#### 子任务

- [ ] 统一列表页数据来源
- [ ] 展示标题、描述、状态、更新时间、版本号
- [ ] 增加搜索能力
- [ ] 增加状态筛选
- [ ] 增加排序能力
- [ ] 增加空态
- [ ] 增加错误态
- [ ] 增加加载态

#### 验收标准

- 列表可稳定浏览
- 筛选和搜索行为正常

### TASK-009 控制台首页可用化

#### 页面

- `src/pages/Console/index.tsx`

#### 子任务

- [ ] 只展示已发布配置
- [ ] 增加空态提示
- [ ] 增加错误态提示
- [ ] 增加权限不足提示
- [ ] 点击卡片可正确跳转详情页

#### 验收标准

- 未发布配置不出现在控制台
- 已发布配置可被业务用户访问

### TASK-010 控制台详情页稳定加载

#### 页面

- `src/pages/Console/Detail.tsx`

#### 子任务

- [ ] 正确处理 objectKey 非法
- [ ] 正确处理配置不存在
- [ ] 正确处理权限不足
- [ ] 正确处理加载失败
- [ ] 与预览使用同一运行模型

#### 验收标准

- 所有异常分支都有稳定页面表现

### TASK-011 定义 V1 编辑器能力边界

#### 子任务

- [ ] 在编辑器中只保留 `tabs`
- [ ] 在 tab 中只保留 `list/form/detail/form-detail`
- [ ] 隐藏 `sections`
- [ ] 隐藏 `wizard`
- [ ] 隐藏 `dashboard`
- [ ] 隐藏 `custom`
- [ ] 隐藏 `chart`
- [ ] 隐藏 `VisualNodeEditor` 入口或明确标记规划中

#### 验收标准

- 编辑器中不再出现未实现能力

### TASK-012 重构 LayoutDesigner

#### 页面/组件

- `src/pages/WorkspaceEditor/components/LayoutDesigner.tsx`

#### 子任务

- [ ] 支持新建 tab
- [ ] 支持编辑 tab 标题
- [ ] 支持编辑 tab 图标
- [ ] 支持设置默认激活 tab
- [ ] 支持排序 tab
- [ ] 支持删除 tab
- [ ] 支持 tab 基础校验

#### 验收标准

- tab 管理操作完整可靠

### TASK-013 重构 TabEditor

#### 子任务

- [ ] 按 layout type 显示不同配置项
- [ ] 配置项字段联动正确
- [ ] 删除无效输入项
- [ ] 保存前做字段校验
- [ ] 修改后驱动预览刷新

#### 验收标准

- tab 配置改动能稳定落到预览和保存结果中

### TASK-014 下线伪编排节点编辑能力

#### 页面/组件

- `src/pages/WorkspaceEditor/components/VisualNodeEditor.tsx`
- `src/pages/WorkspaceEditor/utils/nodeAdapter.ts`

#### 子任务

- [ ] 明确 V1 不交付节点执行编排
- [ ] 隐藏入口或增加明显提示
- [ ] 避免用户误以为 `condition` / `transform` 会真正生效
- [ ] 如果保留代码，标记为内部实验能力，不对业务开放

#### 验收标准

- V1 用户不会被误导

### TASK-015 增加保存前配置校验

#### 子任务

- [ ] 校验 `objectKey`
- [ ] 校验 `title`
- [ ] 校验至少一个 tab
- [ ] 校验每个 tab 必须有 layout
- [ ] 校验不同布局类型的关键字段
- [ ] 错误项定位到具体 tab 和字段

#### 验收标准

- 非法配置不能保存
- 错误消息对业务和研发都可理解

---

## EPIC-4：渲染器重构

目标：编辑器可配什么，运行时就能稳定渲染什么。

### TASK-016 收敛 WorkspaceRenderer 支持面

#### 组件

- `src/components/WorkspaceRenderer/index.tsx`

#### 子任务

- [ ] 删除 V1 不支持的布局分支
- [ ] 对非法布局给出明确错误
- [ ] 禁止出现“暂未实现”作为线上运行时主表现

#### 验收标准

- 运行时不存在占位式布局提示

### TASK-017 重构 TabContentRenderer

#### 组件

- `src/components/WorkspaceRenderer/TabContentRenderer.tsx`

#### 子任务

- [ ] 只保留 V1 支持的内容布局分发
- [ ] 统一不同 renderer 的入参语义
- [ ] 移除无实际使用的分支

#### 验收标准

- 分发逻辑清晰，渲染路径可测试

### TASK-018 统一各 Renderer 的输入模型

#### 涉及组件

- `ListRenderer`
- `FormRenderer`
- `DetailRenderer`
- `FormDetailRenderer`

#### 子任务

- [ ] 统一 props 结构
- [ ] 统一 `layout` 输入方式
- [ ] 统一 `objectKey` 传递方式
- [ ] 统一 `context` 使用方式
- [ ] 统一空态与错误态显示风格

#### 验收标准

- renderer 之间接口风格一致
- 更容易补测试与维护

### TASK-019 预览与控制台运行时一致

#### 子任务

- [ ] `ConfigPreview` 走同一渲染路径
- [ ] `Console/Detail` 走同一渲染路径
- [ ] 消除预览与线上展示差异

#### 验收标准

- 编辑器看到的效果与控制台看到的效果一致

---

## EPIC-5：版本、发布、权限、审计

目标：从“能用”提升到“可治理”。

### TASK-020 增加草稿与发布版本模型

#### 后端目标

- 当前草稿
- 当前发布版
- 历史版本

#### 子任务

- [ ] 设计版本存储结构
- [ ] 区分草稿与发布版本
- [ ] 保存草稿不覆盖历史版本
- [ ] 发布时生成历史记录
- [ ] 取消发布不删除历史版本

#### 验收标准

- 草稿、发布版、历史版三者边界清晰

### TASK-021 增加版本列表接口

#### 子任务

- [ ] 增加查询版本列表接口
- [ ] 增加查询单个版本详情接口
- [ ] 支持按时间和对象过滤

#### 验收标准

- 前端可查看版本历史

### TASK-022 增加回滚接口

#### 子任务

- [ ] 支持按版本回滚
- [ ] 回滚后保留审计记录
- [ ] 回滚结果可再次发布

#### 验收标准

- 任意历史版本可恢复为当前草稿

### TASK-023 增加前端版本面板

#### 子任务

- [ ] 查看历史版本列表
- [ ] 查看版本详情
- [ ] 对比版本摘要
- [ ] 执行回滚
- [ ] 回滚前确认提示

#### 验收标准

- 管理员可从 UI 直接完成回滚

### TASK-024 定义 Workspace 权限点

#### 权限建议

- `workspaces:read`
- `workspaces:edit`
- `workspaces:publish`
- `workspaces:rollback`
- `workspaces:delete`

#### 子任务

- [ ] 定义权限点清单
- [ ] 配置角色映射
- [ ] 对齐前后端权限语义

#### 验收标准

- 权限点可落地到页面和接口

### TASK-025 后端接口权限校验

#### 子任务

- [ ] 列表接口校验读取权限
- [ ] 保存接口校验编辑权限
- [ ] 发布接口校验发布权限
- [ ] 回滚接口校验回滚权限
- [ ] 删除接口校验删除权限

#### 验收标准

- 前端绕过不可直接调用成功

### TASK-026 前端按钮级权限控制

#### 子任务

- [ ] 按权限显示编辑按钮
- [ ] 按权限显示发布按钮
- [ ] 按权限显示删除按钮
- [ ] 按权限显示回滚按钮
- [ ] 无权限时展示禁用原因或隐藏入口

#### 验收标准

- 不同角色看到不同操作入口

### TASK-027 增加操作审计日志

#### 记录范围

- 保存草稿
- 发布
- 取消发布
- 回滚
- 删除

#### 子任务

- [ ] 设计审计日志结构
- [ ] 记录操作者信息
- [ ] 记录对象标识
- [ ] 记录动作类型
- [ ] 记录时间戳
- [ ] 记录变更摘要

#### 验收标准

- 关键操作可追溯
- 能按对象和时间检索

---

## EPIC-6：测试与回归

目标：保证后续迭代不会持续回归打坏。

### TASK-028 Service 层单元测试

#### 范围

- `workspace` service
- 发布/取消发布逻辑
- 版本查询逻辑

#### 子任务

- [ ] 为统一后的 service 层增加测试
- [ ] 覆盖接口成功分支
- [ ] 覆盖错误分支

#### 验收标准

- 关键 service 有稳定单测

### TASK-029 Renderer 组件测试

#### 子任务

- [ ] tabs 渲染测试
- [ ] list 渲染测试
- [ ] form 渲染测试
- [ ] detail 渲染测试
- [ ] form-detail 渲染测试

#### 验收标准

- V1 布局渲染有基本测试覆盖

### TASK-030 核心链路集成测试

#### 链路

- 创建配置
- 保存草稿
- 发布
- 控制台访问
- 回滚

#### 子任务

- [ ] 编写最小闭环集成测试
- [ ] 覆盖成功链路
- [ ] 覆盖关键失败链路

#### 验收标准

- 至少一条核心链路可自动化验证

### TASK-031 手工回归清单

#### 子任务

- [ ] 输出回归 checklist
- [ ] 按角色整理测试场景
- [ ] 按页面整理测试场景
- [ ] 按发布链路整理测试场景

#### 验收标准

- QA 或研发可以照单回归

---

## EPIC-7：企业增强能力

目标：在 V1 稳定可用后，再补企业使用中的协作和运维能力。

### TASK-032 支持配置导出

- [ ] 导出当前配置 JSON
- [ ] 导出当前已发布版本
- [ ] 导出元信息

### TASK-033 支持配置导入

- [ ] 导入 JSON
- [ ] 导入前校验
- [ ] 导入冲突提示
- [ ] 导入后生成草稿

### TASK-034 模板中心重构

- [ ] 提供内置模板
- [ ] 提供团队模板
- [ ] 模板元数据管理
- [ ] 模板应用预览

### TASK-035 模板应用预检查

- [ ] 检查必需函数是否存在
- [ ] 检查字段是否兼容
- [ ] 检查布局是否合法

### TASK-036 版本 Diff 能力

- [ ] 展示字段差异
- [ ] 展示布局差异
- [ ] 展示 tab 结构差异

### TASK-037 发布前变更摘要

- [ ] 生成变更摘要
- [ ] 发布前确认展示

### TASK-038 回滚前风险提示

- [ ] 提示将覆盖当前草稿
- [ ] 提示可能影响控制台行为

### TASK-039 前端埋点

- [ ] 页面打开埋点
- [ ] 保存埋点
- [ ] 发布埋点
- [ ] 渲染失败埋点

### TASK-040 后端日志标准化

- [ ] 统一结构化日志字段
- [ ] 统一错误日志规范

### TASK-041 渲染失败告警

- [ ] 关键渲染失败告警
- [ ] 发布后异常告警

### TASK-042 配置备份策略

- [ ] 历史版本备份
- [ ] 导出备份机制

### TASK-043 灰度发布策略

- [ ] 定义灰度对象
- [ ] 定义灰度规则

### TASK-044 回滚 SOP

- [ ] 定义回滚步骤
- [ ] 定义事故处理流程

### TASK-045 环境隔离与配置校验

- [ ] dev/test/pre/prod 环境规则
- [ ] 环境差异校验

---

## 4. 推荐实施顺序

### 第一阶段：先打通闭环

优先完成：

- [ ] TASK-001
- [ ] TASK-004
- [ ] TASK-005
- [ ] TASK-008
- [ ] TASK-009
- [ ] TASK-010
- [ ] TASK-011
- [ ] TASK-012
- [ ] TASK-013
- [ ] TASK-015
- [ ] TASK-016
- [ ] TASK-017
- [ ] TASK-018
- [ ] TASK-019

阶段目标：

- 编辑器可用
- 发布链路可用
- 控制台访问可用

### 第二阶段：补齐治理能力

优先完成：

- [ ] TASK-020
- [ ] TASK-021
- [ ] TASK-022
- [ ] TASK-023
- [ ] TASK-024
- [ ] TASK-025
- [ ] TASK-026
- [ ] TASK-027

阶段目标：

- 版本管理可用
- 回滚可用
- 权限可控
- 审计可查

### 第三阶段：做企业增强

优先完成：

- [ ] TASK-028
- [ ] TASK-029
- [ ] TASK-030
- [ ] TASK-031
- [ ] TASK-032 ~ TASK-045

阶段目标：

- 自动化测试完善
- 导入导出可用
- 模板可复用
- 运维治理更完善

---

## 5. 文件级改造清单

以下是当前仓库中优先涉及的关键文件。

### 5.1 模型与服务层

- [ ] `croupier-dashboard/src/types/workspace.ts`
- [ ] `croupier-dashboard/src/services/workspaceConfig.ts`
- [ ] `croupier-dashboard/src/services/api/workspace.ts`
- [ ] `croupier/services/server/modules/workspace.api`

### 5.2 页面层

- [ ] `croupier-dashboard/src/pages/Workspaces/index.tsx`
- [ ] `croupier-dashboard/src/pages/Workspaces/Detail.tsx`
- [ ] `croupier-dashboard/src/pages/Console/index.tsx`
- [ ] `croupier-dashboard/src/pages/Console/Detail.tsx`
- [ ] `croupier-dashboard/src/pages/WorkspaceEditor/index.tsx`

### 5.3 编辑器组件

- [ ] `croupier-dashboard/src/pages/WorkspaceEditor/components/LayoutDesigner.tsx`
- [ ] `croupier-dashboard/src/pages/WorkspaceEditor/components/TabEditor.tsx`
- [ ] `croupier-dashboard/src/pages/WorkspaceEditor/components/ConfigPreview.tsx`
- [ ] `croupier-dashboard/src/pages/WorkspaceEditor/components/VisualNodeEditor.tsx`
- [ ] `croupier-dashboard/src/pages/WorkspaceEditor/utils/nodeAdapter.ts`

### 5.4 运行时渲染器

- [ ] `croupier-dashboard/src/components/WorkspaceRenderer/index.tsx`
- [ ] `croupier-dashboard/src/components/WorkspaceRenderer/TabsLayout.tsx`
- [ ] `croupier-dashboard/src/components/WorkspaceRenderer/TabContentRenderer.tsx`
- [ ] `croupier-dashboard/src/components/WorkspaceRenderer/renderers/ListRenderer.tsx`
- [ ] `croupier-dashboard/src/components/WorkspaceRenderer/renderers/FormRenderer.tsx`
- [ ] `croupier-dashboard/src/components/WorkspaceRenderer/renderers/DetailRenderer.tsx`
- [ ] `croupier-dashboard/src/components/WorkspaceRenderer/renderers/FormDetailRenderer.tsx`
- [ ] `croupier-dashboard/src/components/WorkspaceRenderer/renderers/GridRenderer.tsx`

---

## 6. 验收清单

最终验收必须逐项通过：

### 6.1 配置能力

- [ ] 可以新建工作台
- [ ] 可以编辑 tab
- [ ] 可以编辑基础布局
- [ ] 可以保存草稿
- [ ] 非法配置不能保存

### 6.2 发布能力

- [ ] 可以发布
- [ ] 发布后控制台可见
- [ ] 可以取消发布
- [ ] 可以查看历史版本
- [ ] 可以回滚

### 6.3 运行时能力

- [ ] 预览与控制台一致
- [ ] 不出现“暂未实现”页面
- [ ] 不出现空白页
- [ ] 不出现前端状态破坏

### 6.4 治理能力

- [ ] 有权限控制
- [ ] 有审计日志
- [ ] 有错误提示规范
- [ ] 有基础测试覆盖

---

## 7. 明确不做事项

V1 明确不做：

- [ ] 真正的流程执行引擎
- [ ] 条件分支执行
- [ ] 数据转换表达式执行
- [ ] dashboard 全量运行时
- [ ] chart 渲染体系
- [ ] 多人实时协作编辑
- [ ] 审批流

这些能力必须在 V1 完全稳定后，再单独立项设计。

---

## 8. 执行建议

如果要立刻开工，建议按以下顺序启动：

### 第一批立即开始

- [ ] TASK-001 统一模型
- [ ] TASK-004 合并 service
- [ ] TASK-005 修发布状态 bug
- [ ] TASK-011 收缩编辑器能力边界
- [ ] TASK-016 收敛渲染器支持面

### 第二批随后开始

- [ ] TASK-008 工作台列表可用化
- [ ] TASK-009 控制台首页可用化
- [ ] TASK-010 控制台详情稳定化
- [ ] TASK-012 重构 LayoutDesigner
- [ ] TASK-013 重构 TabEditor
- [ ] TASK-015 保存前校验
- [ ] TASK-018 统一 renderer 输入模型

### 第三批治理能力

- [ ] TASK-020 版本模型
- [ ] TASK-021 版本列表接口
- [ ] TASK-022 回滚接口
- [ ] TASK-024 权限点定义
- [ ] TASK-025 后端权限校验
- [ ] TASK-027 审计日志

这三批做完，项目才算从“半成品编排 UI”进入“企业可用工作台平台”的状态。
