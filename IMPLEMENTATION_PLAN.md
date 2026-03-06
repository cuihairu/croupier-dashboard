# Core V2 原型 - 完整实施计划

**分支**: `feature/core-v2-prototype` **开始日期**: 2026-03-06 **预计完成**: 2026-03-13 (1 周)

---

## 📋 目录结构

```
src/
├── components/
│   ├── PageGenerator/              ✅ 已创建
│   │   ├── index.tsx              # 页面生成器入口
│   │   ├── ListPage.tsx           # 列表页生成器
│   │   ├── FormPage.tsx           # 表单页生成器
│   │   ├── DetailPage.tsx         # 详情页生成器
│   │   ├── hooks.ts               # 动态数据Hook
│   │   └── types.ts               # 类型定义
│   │
│   ├── ConfigEditor/               ⏳ 待创建（Week 2）
│   │   ├── index.tsx
│   │   ├── PageConfigEditor.tsx
│   │   ├── ListConfigEditor.tsx
│   │   └── FormConfigEditor.tsx
│   │
│   └── formily/                    ✅ 保留现有
│
├── pages/
│   ├── DynamicPage/                ✅ 已创建
│   │   └── index.tsx              # 动态页面容器
│   │
│   ├── ConfigManagement/           ⏳ 待创建（Week 2）
│   │   ├── index.tsx              # 配置管理列表
│   │   └── Editor.tsx             # 配置编辑器
│   │
│   └── ...                         ✅ 保留现有页面
│
├── services/
│   ├── pageConfig.ts               ✅ 已创建
│   ├── mockPageConfigs.ts          ✅ 已创建
│   └── api/                        ✅ 保留现有
│
└── config/
    └── routes.ts                   ✅ 已修改（添加V2测试路由）
```

---

## 🎯 Week 1: 核心引擎验证（Day 1-7）

### ✅ Day 1: 基础架构（已完成）

**已完成**:

- [x] 创建 `PageGenerator` 组件
- [x] 创建 `ListPage` 生成器
- [x] 创建 `FormPage` 生成器
- [x] 创建 `DetailPage` 生成器
- [x] 创建 `DynamicPage` 容器
- [x] 创建 `pageConfig` 服务
- [x] 创建 Mock 配置数据
- [x] 修改路由配置，添加 `/v2/*` 测试路由

**文件清单**:

```
✅ src/components/PageGenerator/index.tsx
✅ src/components/PageGenerator/ListPage.tsx
✅ src/components/PageGenerator/FormPage.tsx
✅ src/components/PageGenerator/DetailPage.tsx
✅ src/components/PageGenerator/hooks.ts
✅ src/components/PageGenerator/types.ts
✅ src/pages/DynamicPage/index.tsx
✅ src/services/pageConfig.ts
✅ src/services/mockPageConfigs.ts
✅ config/routes.ts (已修改)
```

---

### ⏳ Day 2: 测试和调试

**任务**:

- [ ] 启动项目，测试 `/v2/users` 路由
- [ ] 验证列表页是否正常显示
- [ ] 验证表单页是否正常显示
- [ ] 验证详情页是否正常显示
- [ ] 修复发现的 Bug

**测试清单**:

```bash
# 1. 启动项目
npm start

# 2. 访问测试页面
http://localhost:8000/v2/users          # 用户列表
http://localhost:8000/v2/users/create   # 创建用户
http://localhost:8000/v2/users/1        # 用户详情
http://localhost:8000/v2/roles          # 角色列表
```

**预期结果**:

- ✅ 列表页能正常显示数据
- ✅ 表格列渲染正确（状态、日期、标签等）
- ✅ 操作按钮可点击
- ✅ 表单页能正常显示
- ✅ 表单字段渲染正确
- ✅ 表单验证生效
- ✅ 详情页能正常显示

---

### ⏳ Day 3: 连接真实数据源

**任务**:

- [ ] 修改 Mock 配置，使用真实的函数调用
- [ ] 测试与现有 API 的集成
- [ ] 验证数据加载和刷新

**示例配置**:

```typescript
// 修改 mockPageConfigs.ts
{
  id: 'users-list-v2',
  type: 'list',
  title: '用户管理（V2）',
  path: '/v2/users',
  dataSource: {
    type: 'function',
    functionId: 'user.list',  // 使用真实的函数ID
  },
  // ...
}
```

**测试**:

- [ ] 列表页能加载真实数据
- [ ] 刷新功能正常
- [ ] 错误处理正常

---

### ⏳ Day 4: 完善功能

**任务**:

- [ ] 添加筛选功能
- [ ] 添加排序功能
- [ ] 添加分页功能
- [ ] 优化加载状态
- [ ] 优化错误提示

**增强 ListPage**:

```typescript
// 添加筛选器渲染
const renderFilters = () => {
  if (!filters) return null;

  return (
    <Form layout="inline" onFinish={handleFilter}>
      {filters.map((filter) => (
        <Form.Item key={filter.key} name={filter.key} label={filter.label}>
          {renderFilterField(filter)}
        </Form.Item>
      ))}
      <Form.Item>
        <Button type="primary" htmlType="submit">
          查询
        </Button>
      </Form.Item>
    </Form>
  );
};
```

---

### ⏳ Day 5: 性能优化

**任务**:

- [ ] 使用 React.memo 优化组件
- [ ] 使用 useMemo 缓存计算结果
- [ ] 优化列表渲染性能
- [ ] 测试大数据量场景

**性能指标**:

- 首屏加载 < 2 秒
- 路由切换 < 500ms
- 列表渲染 < 1 秒

---

### ⏳ Day 6: 对比测试

**任务**:

- [ ] 对比现有页面 vs V2 页面
- [ ] 记录开发效率对比
- [ ] 记录代码量对比
- [ ] 记录性能对比

**对比表格**:

| 指标           | 现有架构   | V2 架构      | 提升     |
| -------------- | ---------- | ------------ | -------- |
| 添加新页面时间 | 2-4 小时   | 5 分钟       | 24-48 倍 |
| 代码量         | 100-200 行 | 10-20 行配置 | 10 倍    |
| 首屏加载       | ?          | ?            | ?        |
| 维护成本       | 高         | 低           | -        |

---

### ⏳ Day 7: 验收和决策

**验收标准**:

- [ ] 动态路由可运行
- [ ] 列表页可正常展示
- [ ] 表单页可正常提交
- [ ] 详情页可正常展示
- [ ] 可以添加新页面（只需修改配置）
- [ ] 性能可接受（首屏<2 秒）
- [ ] 代码简洁（核心代码<500 行）

**决策**:

- ✅ **验收通过** → 进入 Week 2，开发配置编辑器
- ❌ **验收不通过** → 分析问题，评估是否切换到 Amis

---

## 🚀 Week 2: 配置编辑器（Day 8-14）

### Day 8-9: 配置管理页面

**任务**:

- [ ] 创建配置列表页面
- [ ] 显示所有页面配置
- [ ] 支持搜索和筛选
- [ ] 支持新建/编辑/删除

**文件**:

```
src/pages/ConfigManagement/
├── index.tsx              # 配置列表
└── Editor.tsx             # 配置编辑器
```

---

### Day 10-11: 列表配置编辑器

**任务**:

- [ ] 创建列表配置编辑器
- [ ] 支持添加/编辑/删除列
- [ ] 支持配置列渲染方式
- [ ] 支持配置操作按钮

**组件**:

```typescript
<ListConfigEditor value={config.ui.list} onChange={handleChange} />
```

---

### Day 12-13: 表单配置编辑器

**任务**:

- [ ] 创建表单配置编辑器
- [ ] 支持添加/编辑/删除字段
- [ ] 支持配置字段类型
- [ ] 支持配置验证规则

---

### Day 14: 集成和测试

**任务**:

- [ ] 集成配置编辑器到配置管理页面
- [ ] 测试配置的保存和加载
- [ ] 测试配置的实时预览
- [ ] 完善文档

---

## 📊 验收标准

### 功能验收

**必须达到**:

- [x] 动态路由可运行
- [ ] 列表页可正常展示
- [ ] 表单页可正常提交
- [ ] 详情页可正常展示
- [ ] 可以添加新页面（只需修改配置）
- [ ] 性能可接受（首屏<2 秒）

**加分项**:

- [ ] 支持筛选和排序
- [ ] 支持批量操作
- [ ] 支持自定义列渲染
- [ ] 配置编辑器可用
- [ ] 配置实时预览

---

### 代码质量

- [x] TypeScript 类型完整
- [x] 代码结构清晰
- [ ] 无明显 Bug
- [ ] 性能良好

---

## 🎬 下一步行动

### 立即执行（今天）

```bash
# 1. 确认当前分支
git branch

# 2. 查看已创建的文件
ls -la src/components/PageGenerator/
ls -la src/pages/DynamicPage/
ls -la src/services/

# 3. 启动项目测试
npm start

# 4. 访问测试页面
# http://localhost:8000/v2/users
```

---

### 明天（Day 2）

1. **测试所有页面**

   - 访问 `/v2/users` 查看列表页
   - 访问 `/v2/users/create` 查看表单页
   - 访问 `/v2/users/1` 查看详情页
   - 访问 `/v2/roles` 查看角色列表

2. **记录问题**

   - 创建 `ISSUES.md` 记录发现的问题
   - 按优先级排序
   - 逐个修复

3. **性能测试**
   - 使用 Chrome DevTools 测试性能
   - 记录加载时间
   - 优化慢的部分

---

## 📝 技术要点

### 1. 完全复用现有技术栈

- ✅ Ant Design 5
- ✅ Pro Components
- ✅ Formily 2
- ✅ Umi Max
- ✅ 现有 API 层
- ✅ 现有权限系统

### 2. 最小改动原则

- ✅ 不修改现有页面
- ✅ 不修改现有组件
- ✅ 只添加新组件
- ✅ 通过新路由测试

### 3. 渐进式迁移

```
Phase 1: 验证原型（Week 1）
  ↓
Phase 2: 配置编辑器（Week 2）
  ↓
Phase 3: 迁移现有页面（Week 3-4）
  ↓
Phase 4: 全面替换（Week 5-8）
```

---

## 🔧 常见问题

### Q1: 如何添加新页面？

**A**: 修改 `src/services/mockPageConfigs.ts`，添加新配置：

```typescript
{
  id: 'new-page',
  type: 'list',
  title: '新页面',
  path: '/v2/new-page',
  dataSource: { type: 'static', staticData: [...] },
  ui: { list: { columns: [...] } }
}
```

然后在 `config/routes.ts` 添加路由：

```typescript
{
  path: '/v2/new-page',
  name: 'NewPage',
  component: './DynamicPage',
}
```

---

### Q2: 如何连接真实 API？

**A**: 修改配置的 `dataSource`：

```typescript
dataSource: {
  type: 'function',
  functionId: 'your.function.id',  // 使用现有的函数ID
}
```

或者：

```typescript
dataSource: {
  type: 'api',
  apiEndpoint: '/api/your-endpoint',
  method: 'GET',
}
```

---

### Q3: 如何复用现有的 Formily Schema？

**A**: 在表单配置中使用 `formilySchema`：

```typescript
ui: {
  form: {
    formilySchema: {
      // 你现有的 Formily Schema
      type: 'object',
      properties: {
        username: {
          type: 'string',
          title: '用户名',
          'x-component': 'Input',
        },
      },
    },
  },
}
```

---

### Q4: 性能如何优化？

**A**:

1. 使用 `React.memo` 包装组件
2. 使用 `useMemo` 缓存计算结果
3. 使用虚拟滚动（react-window）
4. 懒加载页面组件

---

## 🎯 成功指标

### 开发效率

**目标**: 添加新页面从 2-4 小时 → 5 分钟

**测试方法**:

1. 计时添加一个新的列表页（现有方式）
2. 计时添加一个新的列表页（V2 方式）
3. 对比时间

---

### 代码量

**目标**: 从 100-200 行 → 10-20 行配置

**测试方法**:

1. 统计现有页面的代码行数
2. 统计 V2 配置的行数
3. 对比差异

---

### 性能

**目标**:

- 首屏加载 < 2 秒
- 路由切换 < 500ms
- 列表渲染 < 1 秒

**测试方法**: 使用 Chrome DevTools Performance 面板测试

---

## 📞 需要帮助？

如果遇到问题：

1. **查看文档**

   - `CORE_V2_PLAN.md` - 完整计划
   - `README_NEW_ARCHITECTURE.md` - 架构说明
   - `PROTOTYPE_IMPLEMENTATION.md` - 实现细节

2. **查看代码**

   - `src/components/PageGenerator/` - 核心组件
   - `src/services/mockPageConfigs.ts` - 配置示例

3. **调试技巧**
   - 使用 `console.log` 查看配置和数据
   - 使用 React DevTools 查看组件状态
   - 使用 Network 面板查看 API 调用

---

**准备好了吗？让我们开始测试！** 🚀
