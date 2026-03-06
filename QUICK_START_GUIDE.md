# 快速启动指南：立即开始新架构原型

**目标**: 今天就开始，1 周内验证新架构可行性 **适合**: 决定尝试自研新架构的开发者

---

## 第一步：5 分钟快速决策

### 回答 3 个问题

**问题 1**: 你的 React 水平如何？

- [ ] 熟练 (2 年以上经验) → 继续
- [ ] 一般 (1 年经验) → 继续，但可能需要 2 周
- [ ] 新手 → 建议用 Amis

**问题 2**: 你能投入多少时间？

- [ ] 1 周全职 → 完美
- [ ] 2 周兼职 → 可以
- [ ] 零碎时间 → 建议用 Amis

**问题 3**: 你的目标是什么？

- [ ] 完全掌控，技术积累 → 自研
- [ ] 快速上线，功能够用 → Amis
- [ ] 平衡两者 → Refine 混合

### 如果你选择自研，继续往下看 ↓

---

## 第二步：30 分钟环境准备

### 2.1 检查环境

```bash
# 检查Node.js版本 (需要18+)
node -v

# 检查npm/pnpm
npm -v
# 或
pnpm -v

# 如果版本不够，安装最新版
# https://nodejs.org/
```

### 2.2 创建项目

```bash
# 进入工作目录
cd ~/workspace  # 或你的工作目录

# 创建新项目
npm create vite@latest croupier-new -- --template react-ts

# 进入项目
cd croupier-new

# 安装依赖
npm install

# 安装核心依赖
npm install react-router-dom@6 antd @ant-design/pro-components @ant-design/icons axios zustand

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173，看到 Vite 欢迎页面说明成功。

### 2.3 配置 TypeScript

```bash
# 修改 tsconfig.json
```

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```bash
# 修改 vite.config.ts
```

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:18780',
        changeOrigin: true,
      },
    },
  },
});
```

**环境准备完成！** ✅

---

## 第三步：2 小时核心代码

### 3.1 创建目录结构

```bash
mkdir -p src/core/{types,router,generator,hooks,config}
mkdir -p src/api
```

### 3.2 复制核心代码

从 `PROTOTYPE_IMPLEMENTATION.md` 复制以下文件：

**必须文件** (按顺序创建):

1. `src/core/types/index.ts` - 类型定义 ✅
2. `src/core/router/DynamicRouter.tsx` - 动态路由 ✅
3. `src/core/generator/PageGenerator.tsx` - 页面生成器 ✅
4. `src/core/generator/ListPage.tsx` - 列表页 ✅
5. `src/core/generator/FormPage.tsx` - 表单页 ✅
6. `src/core/hooks/useDataSource.ts` - 数据源 Hook ✅
7. `src/api/index.ts` - API 层 ✅
8. `src/api/mock.ts` - Mock 数据 ✅
9. `src/App.tsx` - 应用入口 ✅

**提示**: 所有代码都在 `PROTOTYPE_IMPLEMENTATION.md` 中，直接复制即可。

### 3.3 快速验证

```bash
# 启动开发服务器
npm run dev

# 访问
http://localhost:5173/users
```

**如果看到用户列表页面，说明成功！** 🎉

---

## 第四步：1 天完善功能

### 4.1 添加更多页面

在 `src/api/index.ts` 的 `fetchPageConfigs` 中添加更多配置：

```typescript
// 添加角色管理页面
{
  id: 'role-list',
  type: 'list',
  title: '角色管理',
  path: '/roles',
  dataSource: { type: 'static' },
  ui: {
    list: {
      columns: [
        { key: 'id', title: 'ID', width: 80 },
        { key: 'name', title: '角色名', width: 150 },
        { key: 'description', title: '描述', width: 300 },
      ],
    },
  },
},

// 添加权限管理页面
{
  id: 'permission-list',
  type: 'list',
  title: '权限管理',
  path: '/permissions',
  dataSource: { type: 'static' },
  ui: {
    list: {
      columns: [
        { key: 'id', title: 'ID', width: 80 },
        { key: 'resource', title: '资源', width: 150 },
        { key: 'action', title: '操作', width: 150 },
      ],
    },
  },
},
```

### 4.2 添加筛选功能

修改 `src/core/generator/ListPage.tsx`，添加筛选器渲染：

```typescript
// 在ListPage组件中添加
const [filters, setFilters] = useState<any>({});

const handleFilter = (values: any) => {
  setFilters(values);
  refresh(values);
};

// 渲染筛选器
const renderFilters = () => {
  if (!config.ui.list?.filters) return null;

  return (
    <Form layout="inline" onFinish={handleFilter}>
      {config.ui.list.filters.map(filter => (
        <Form.Item key={filter.key} name={filter.key} label={filter.label}>
          {filter.type === 'input' && <Input placeholder={`请输入${filter.label}`} />}
          {filter.type === 'select' && (
            <Select placeholder={`请选择${filter.label}`} style={{ width: 200 }}>
              {filter.options?.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          )}
        </Form.Item>
      ))}
      <Form.Item>
        <Button type="primary" htmlType="submit">查询</Button>
      </Form.Item>
    </Form>
  );
};

// 在PageContainer中使用
<PageContainer title={config.title} extra={renderActions()}>
  {renderFilters()}
  <ProTable ... />
</PageContainer>
```

### 4.3 添加详情页

创建 `src/core/generator/DetailPage.tsx`：

```typescript
import { PageContainer, ProDescriptions } from '@ant-design/pro-components';
import { PageConfig } from '../types';
import { useDataSource } from '../hooks/useDataSource';

interface DetailPageProps {
  config: PageConfig;
}

export function DetailPage({ config }: DetailPageProps) {
  const { data, loading } = useDataSource(config.dataSource);
  const record = data[0] || {};

  return (
    <PageContainer title={config.title}>
      <ProDescriptions column={2} dataSource={record} loading={loading}>
        {config.ui.detail?.sections.map((section) => (
          <ProDescriptions.Item key={section.key} label={section.label} dataIndex={section.key} />
        ))}
      </ProDescriptions>
    </PageContainer>
  );
}
```

---

## 第五步：验收与决策

### 5.1 功能验收清单

- [ ] 动态路由可运行
- [ ] 列表页可正常展示
- [ ] 表单页可正常提交
- [ ] 菜单自动生成
- [ ] 可以添加新页面（只需修改配置）
- [ ] 性能可接受（首屏<2 秒）

### 5.2 决策点

**如果验收通过**:

- ✅ 说明新架构可行
- ✅ 继续按照 Week 2-8 的计划开发
- ✅ 2 个月后可以替代现有系统

**如果验收不通过**:

- ⚠️ 分析失败原因
- ⚠️ 评估是否可以解决
- ⚠️ 如果无法解决，立即切换到 Amis

### 5.3 关键指标

**必须达到的指标**:

- 首屏加载 < 2 秒
- 路由切换 < 500ms
- 列表渲染 < 1 秒
- 添加新页面 < 5 分钟（只需修改配置）

**如果达到这些指标，说明架构可行！**

---

## 第六步：下一步计划

### 如果原型验证通过

**Week 2: 完善列表页**

- [ ] 添加排序功能
- [ ] 添加批量操作
- [ ] 添加导出功能
- [ ] 优化性能

**Week 3: 完善表单页**

- [ ] 支持复杂表单（嵌套、数组）
- [ ] 支持表单验证
- [ ] 支持动态表单
- [ ] 支持文件上传

**Week 4: 实现详情页**

- [ ] 支持多种布局
- [ ] 支持 Tab 分组
- [ ] 支持关联数据
- [ ] 支持编辑模式

**Week 5-6: 配置管理**

- [ ] 配置 CRUD 接口
- [ ] 配置管理界面
- [ ] 配置导入导出
- [ ] 配置版本管理

**Week 7-8: 迁移现有功能**

- [ ] 迁移核心页面
- [ ] 迁移权限系统
- [ ] 迁移审批流程
- [ ] 性能优化

---

## 常见问题

### Q1: 代码复制后报错怎么办？

**A**: 检查以下几点

1. 依赖是否安装完整
2. TypeScript 配置是否正确
3. 路径别名(@/)是否配置
4. 是否按顺序创建文件

### Q2: 页面显示空白怎么办？

**A**: 打开浏览器控制台

1. 查看是否有错误信息
2. 检查网络请求是否正常
3. 检查路由配置是否正确

### Q3: 如何添加新页面？

**A**: 只需修改 `src/api/index.ts`

```typescript
// 在fetchPageConfigs中添加新配置
{
  id: 'new-page',
  type: 'list',
  title: '新页面',
  path: '/new',
  dataSource: { type: 'static' },
  ui: { list: { columns: [...] } },
}
```

### Q4: 如何连接真实后端？

**A**: 修改 `src/core/hooks/useDataSource.ts`

```typescript
// 将mock数据替换为真实API调用
if (config.type === 'function') {
  result = await invokeFunction(config.functionId!, params);
}
```

### Q5: 性能不好怎么办？

**A**: 优化建议

1. 使用 React.memo 包装组件
2. 使用 useMemo 缓存计算结果
3. 使用虚拟滚动（react-window）
4. 懒加载页面组件

---

## 调试技巧

### 1. 查看路由配置

```typescript
// 在DynamicRouter.tsx中添加
console.log('Routes:', routes);
```

### 2. 查看页面配置

```typescript
// 在PageGenerator.tsx中添加
console.log('Page Config:', config);
```

### 3. 查看数据源

```typescript
// 在useDataSource.ts中添加
console.log('Data:', data);
```

### 4. 使用 React DevTools

安装 Chrome 扩展：React Developer Tools

---

## 资源链接

### 官方文档

- [Vite](https://vitejs.dev/)
- [React Router v6](https://reactrouter.com/)
- [Ant Design 5](https://ant.design/)
- [Pro Components](https://procomponents.ant.design/)

### 参考代码

- `PROTOTYPE_IMPLEMENTATION.md` - 完整代码示例
- `REDESIGN_PROPOSAL.md` - 架构设计
- `DECISION_GUIDE.md` - 方案对比

---

## 成功案例

### 预期效果

**添加新页面前** (现有架构):

1. 创建页面组件文件 (100-200 行)
2. 配置路由 (修改 routes.ts)
3. 添加菜单翻译 (修改 locales)
4. 实现数据加载逻辑
5. 实现 UI 渲染逻辑 **总计**: 2-4 小时

**添加新页面后** (新架构):

1. 修改配置 (10-20 行 JSON) **总计**: 5 分钟

**效率提升**: 24-48 倍 🚀

---

## 最后的鼓励

### 给开发者

你现在拥有：

- ✅ 完整的技术方案
- ✅ 详细的实现代码
- ✅ 清晰的开发计划
- ✅ 可行的验证方法

**你需要的只是**:

- 1 周时间
- 一台电脑
- 开始行动

**不要犹豫，现在就开始！**

### 时间表

```
今天:    环境准备 + 核心代码 (3小时)
明天:    完善功能 + 测试 (1天)
第3天:   添加更多页面 (1天)
第4天:   优化与调试 (1天)
第5天:   验收与决策 (半天)
```

**5 天后，你就知道答案了！**

---

## 立即开始

```bash
# 复制这些命令，立即开始
cd ~/workspace
npm create vite@latest croupier-new -- --template react-ts
cd croupier-new
npm install
npm install react-router-dom@6 antd @ant-design/pro-components @ant-design/icons axios zustand
npm run dev
```

**然后打开 `PROTOTYPE_IMPLEMENTATION.md`，开始复制代码！**

---

**祝你成功！** 🎉

如有问题，参考其他文档：

- 技术问题 → `PROTOTYPE_IMPLEMENTATION.md`
- 架构问题 → `REDESIGN_PROPOSAL.md`
- 决策问题 → `DECISION_GUIDE.md`
- 总体概览 → `EXECUTIVE_SUMMARY.md`
