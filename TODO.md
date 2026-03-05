# Workspace 重构 TODO - 总索引

**项目**: Croupier Dashboard Workspace 重构 **开始日期**: 2026-03-06 **预计完成**: 4 周 **当前状态**: 规划完成，准备开始实施

---

## 📚 文档导航

### 核心文档

1. **[架构设计文档](./ARCHITECTURE_DESIGN.md)** - 完整的架构设计和职责划分
2. **[函数描述符分析](./FUNCTION_DESCRIPTOR_ANALYSIS.md)** - 现有函数描述符的满足度分析
3. **[重构计划](./REFACTOR_PLAN.md)** - 重构的整体思路和方案

### TODO 清单

1. **[Week 1 TODO](./TODO_WEEK1.md)** - 基础架构和类型定义
2. **[Week 2 TODO](./TODO_WEEK2.md)** - Layout Engine 和编排器基础
3. **[Week 3 TODO](./TODO_WEEK3.md)** - 可视化编排工具完善
4. **[Week 4 TODO](./TODO_WEEK4.md)** - 测试、优化和文档

---

## 🎯 项目目标

### 核心目标

将 Workspace 从"函数调用工具"改造为"可视化编排的管理界面"

### 核心理念

- **SDK 关注功能注册** - 只提供函数元数据
- **Dashboard 关注 UI 编排** - 负责界面设计和配置
- **配置存储在配置中心** - 前后端解耦

### 完成标准

- [ ] 可以通过可视化工具编排 Workspace
- [ ] 配置可以保存和加载
- [ ] 根据配置自动渲染界面
- [ ] 支持至少 3 种布局类型（tabs, form-detail, list）
- [ ] 现有 Workspace 功能不受影响

---

## 📅 时间规划

### Week 1: 基础架构（2026-03-06 ~ 03-12）

**目标**: 完成类型定义、配置服务、Layout Engine 核心

**关键任务**:

- 定义 WorkspaceConfig 类型
- 实现配置加载和保存服务
- 实现 WorkspaceRenderer 组件
- 实现 TabsLayout 组件

**交付物**:

- 完整的类型定义
- 配置服务 API
- 可以根据配置渲染 Tabs 布局

**详细清单**: [Week 1 TODO](./TODO_WEEK1.md)

---

### Week 2: Layout Engine 和编排器基础（2026-03-13 ~ 03-19）

**目标**: 完成所有渲染器、改造现有 Workspace、开始编排工具

**关键任务**:

- 实现 FormDetailRenderer
- 实现 ListRenderer
- 实现 FormRenderer
- 实现 DetailRenderer
- 改造 Workspace Detail 页面
- 创建 WorkspaceEditor 页面框架

**交付物**:

- 完整的渲染器
- 改造后的 Workspace 页面
- 编排器基础框架

**详细清单**: [Week 2 TODO](./TODO_WEEK2.md)

---

### Week 3: 可视化编排工具（2026-03-20 ~ 03-26）

**目标**: 完成可视化编排工具的核心功能

**关键任务**:

- 实现 LayoutDesigner 组件
- 实现拖拽功能
- 实现配置编辑
- 实现实时预览
- 添加配置模板

**交付物**:

- 完整的可视化编排工具
- 可以拖拽设计 Workspace
- 实时预览功能

**详细清单**: [Week 3 TODO](./TODO_WEEK3.md)

---

### Week 4: 测试、优化和文档（2026-03-27 ~ 04-02）

**目标**: 完善功能、测试、优化、编写文档

**关键任务**:

- 完整测试所有功能
- 性能优化
- 用户体验优化
- 编写使用文档
- 准备演示

**交付物**:

- 稳定的系统
- 完整的文档
- 演示 Demo

**详细清单**: [Week 4 TODO](./TODO_WEEK4.md)

---

## 📊 整体进度

### 总体统计

- **总任务数**: 约 50+ 个
- **已完成**: 0
- **进行中**: 0
- **未开始**: 50+

### 按阶段统计

| 阶段   | 任务数 | 已完成 | 进度 |
| ------ | ------ | ------ | ---- |
| Week 1 | 7      | 0      | 0%   |
| Week 2 | 7      | 0      | 0%   |
| Week 3 | 待定   | 0      | 0%   |
| Week 4 | 待定   | 0      | 0%   |

---

## 🎯 关键里程碑

### Milestone 1: 基础架构完成（Week 1 结束）

**日期**: 2026-03-12 **标志**:

- [ ] 类型定义完整
- [ ] 配置服务可用
- [ ] 可以根据配置渲染简单的 Tabs 布局

**验收方式**: 创建一个简单的配置，能够渲染出 Tabs 界面

---

### Milestone 2: Layout Engine 完成（Week 2 结束）

**日期**: 2026-03-19 **标志**:

- [ ] 所有渲染器实现完成
- [ ] 现有 Workspace 已改造
- [ ] 可以加载和渲染配置

**验收方式**: 访问 `/console/player`，能看到根据配置渲染的界面

---

### Milestone 3: 编排工具完成（Week 3 结束）

**日期**: 2026-03-26 **标志**:

- [ ] 可视化编排工具可用
- [ ] 可以拖拽设计 Workspace
- [ ] 可以保存和预览配置

**验收方式**: 通过编排工具创建一个 Workspace 配置，保存后能正常渲染

---

### Milestone 4: 项目完成（Week 4 结束）

**日期**: 2026-04-02 **标志**:

- [ ] 所有功能测试通过
- [ ] 性能达标
- [ ] 文档完整
- [ ] 可以演示

**验收方式**: 完整演示从编排到渲染的全流程

---

## 🔧 技术栈

### 前端

- **React 18** - UI 框架
- **TypeScript** - 类型系统
- **Ant Design 5** - 组件库
- **Pro Components** - 高级组件
- **React DnD** - 拖拽功能（Week 3）
- **Umi Max** - 应用框架

### 后端（需要新增）

- **Go** - 后端语言
- **PostgreSQL** - 配置存储
- **Redis** - 配置缓存

---

## 📝 开发规范

### 代码规范

1. **TypeScript** - 所有代码必须有类型定义
2. **命名规范** - 使用有意义的变量名
3. **注释** - 复杂逻辑必须有注释
4. **格式化** - 使用 Prettier 格式化

### 提交规范

```
feat: 添加 WorkspaceRenderer 组件
fix: 修复配置加载失败的问题
docs: 更新 README
refactor: 重构 Layout Engine
test: 添加单元测试
```

### 分支规范

- `main` - 主分支，稳定版本
- `feature/core-v2-prototype` - 当前开发分支
- `feature/workspace-editor` - 编排工具分支（可选）

---

## 🐛 问题追踪

### 已知问题

1. ~~TODO 文件写入失败~~ - 已解决，分成多个小文件

### 待解决问题

- 无

---

## 📖 使用指南

### 如何开始

1. **阅读文档**

   ```bash
   # 先阅读架构设计
   cat ARCHITECTURE_DESIGN.md

   # 再阅读函数描述符分析
   cat FUNCTION_DESCRIPTOR_ANALYSIS.md
   ```

2. **查看 TODO**

   ```bash
   # 查看 Week 1 任务
   cat TODO_WEEK1.md

   # 开始第一个任务
   # 任务 1.1.1: 定义 WorkspaceConfig 类型
   ```

3. **开始开发**

   ```bash
   # 创建文件
   touch src/types/workspace.ts

   # 开始编码
   # ...
   ```

### 如何更新进度

1. **完成任务后**

   - 在对应的 TODO 文件中勾选任务
   - 更新本文件的进度统计
   - 提交代码

2. **遇到问题**
   - 在"问题追踪"部分记录
   - 讨论解决方案
   - 更新文档

---

## 🎓 学习资源

### 相关技术文档

- [React 18 文档](https://react.dev/)
- [Ant Design 5 文档](https://ant.design/)
- [Pro Components 文档](https://procomponents.ant.design/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [React DnD 文档](https://react-dnd.github.io/react-dnd/)

### 参考项目

- [Amis](https://aisuda.bce.baidu.com/amis/) - 百度低代码框架
- [Formily](https://formilyjs.org/) - 表单解决方案
- [NocoBase](https://www.nocobase.com/) - 开源低代码平台

---

## 🤝 团队协作

### 角色分工

- **架构师** - 负责架构设计和技术选型
- **前端开发** - 负责前端实现
- **后端开发** - 负责 API 实现
- **测试** - 负责测试和质量保证

### 沟通方式

- **日常沟通** - 即时通讯工具
- **周会** - 每周一次，同步进度
- **代码审查** - Pull Request 审查

---

## 📞 联系方式

### 遇到问题

1. 查看相关文档
2. 搜索已知问题
3. 提问讨论

---

## 🎉 总结

### 核心价值

1. **职责清晰** - SDK 和 Dashboard 各司其职
2. **灵活性高** - UI 配置完全独立
3. **易于维护** - 修改 UI 不需要改后端
4. **用户友好** - 可视化编排，降低使用门槛

### 预期效果

- ✅ 添加新 Workspace 从几小时 → 几分钟
- ✅ 修改 UI 从改代码 → 改配置
- ✅ 降低使用门槛，非开发人员也能编排

### 长期规划

- Phase 1: 完成基础功能（4 周）
- Phase 2: 增强功能（2-4 周）
- Phase 3: 推广使用（持续）

---

**准备好了吗？让我们开始吧！** 🚀

**下一步**: 查看 [Week 1 TODO](./TODO_WEEK1.md)，开始第一个任务
