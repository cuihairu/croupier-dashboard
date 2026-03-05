# 对象工作台与动态菜单重构方案（冻结版）

## 1. 背景与目标

当前问题：

- 动态菜单挂载点不清晰（依赖 `/console` 注入）。
- “函数目录”被当成主入口，违背操作流。
- 菜单分组与对象操作页解耦，用户从菜单到操作路径不连贯。
- 同一对象的一组操作无法稳定落在一个页面，编排能力缺失。

本方案目标：

1. **对象一组操作 = 一个工作台页面**（默认单页）。
2. 菜单只做“进入工作台”的导航，不承载目录式浏览。
3. 支持“默认单页 + 可配置拆分”（Tab/分组/顺序/显隐）。
4. 保持现有后端 descriptor 兼容，前端可渐进迁移。

---

## 2. 冻结原则（防止反复推翻）

- 原则 A：先定信息架构与数据模型，再改 UI 细节。
- 原则 B：一阶段只解决一个核心问题，不跨阶段加需求。
- 原则 C：旧入口必须可回退，灰度完成后再移除旧逻辑。
- 原则 D：任何结构性变更都写入本文件“变更记录”。

---

## 3. 目标信息架构（IA）

- 一级菜单：`系统配置（GameManagement）`
- 二级核心：`对象工作台（Workspaces）`
- 三级动态：按对象（entity/category）生成
  - 例如：`玩家`、`背包`、`订单`、`活动` ...
- 点击对象后进入：`/system/functions/workspaces/:objectKey`

说明：

- 不再出现“函数目录”菜单项。
- “实例管理/告警/权限分配/函数包”保留为工具类静态页。

---

## 4. 路由与页面模型

新增路由：

- `/system/functions/workspaces` -> 默认跳第一个可访问对象
- `/system/functions/workspaces/:objectKey` -> 对象工作台主页面

兼容路由（过渡期保留）：

- `/system/functions/catalog` -> `/system/functions/workspaces`
- `/console` -> `/system/functions/workspaces`

页面结构：

- Header：对象名、scope（game/env）、状态摘要
- Body：按编排配置渲染操作块（Tab 或纵向分组）
- Side（可选）：最近操作、收藏、快捷动作

---

## 5. 动态菜单模型（新）

菜单来源：`listDescriptors()`

分组优先级：

1. `descriptor.menu.nodes`
2. `category + entity`
3. `id` 推断兜底

菜单项类型：

- `workspace-entry`：对象入口（核心）
- `tool-entry`：静态工具页

菜单构建规则：

- 每个对象只生成一个入口（不把每个 operation 都塞进菜单）
- operation 在对象工作台内部展示，不在左侧树泛滥
- 支持“收藏对象 / 最近访问对象”插槽（可选）

---

## 6. 对象工作台编排模型（核心）

新增前端配置模型（可来自后端，前端先支持本地兜底）：

```ts
type WorkspaceLayout = {
  objectKey: string;
  mode: 'single' | 'tabbed'; // 默认 single
  sections: Array<{
    key: string;
    title: string;
    order: number;
    operations: string[]; // descriptor id 列表
    visible?: boolean;
  }>;
};
```

默认策略：

- 所有可访问 operation 按 `order` 落到 `single` 页面。
- 当配置为 `tabbed` 时按 `sections` 分布。

---

## 7. 权限与作用域策略

- 菜单显隐：按对象下 operation 的可访问集合计算（为空则隐藏对象）。
- 页面显隐：工作台内逐操作判权，未授权显示“无权限”占位。
- scope 变化：监听 `scope:change`，自动刷新 descriptors + workspace 数据。

---

## 8. 实施计划（固定阶段）

### 执行看板（完成一个打勾一个）

- [x] Phase 1：菜单引擎替换（去目录化）
- [x] Phase 2：对象工作台页面框架
- [x] Phase 3：可配置拆分能力
- [x] Phase 4：兼容迁移与清理

### Phase 1：菜单引擎替换（去目录化）

- 抽离 `app.tsx` 动态菜单逻辑到 `src/features/navigation/workspaceMenu.ts`
- 菜单改为“对象入口”而非“函数目录/函数明细项”
- 去除 `CATALOG_PATH` 依赖

**验收**：左侧菜单不出现“函数目录”；对象级入口可正常跳转。

### Phase 2：对象工作台页面框架

- 新增 `src/pages/Workspaces/index.tsx` 与 `src/pages/Workspaces/Detail.tsx`
- 建立 descriptor -> object -> operations 组装链
- 单页渲染对象的一组操作（默认 single）

**验收**：任一对象可在单页完成多操作切换/执行。

### Phase 3：可配置拆分能力

- 新增 `workspace layout` 配置读取（先本地，后端接口预留）
- 支持 `single/tabbed` 两种模式
- 支持 section 排序与显隐

**验收**：同一对象可在不改代码前提下切换编排方式。

### Phase 4：兼容迁移与清理

- 旧路由重定向与埋点
- 删除旧 `/console` 注入逻辑
- 文档、i18n、测试补齐

**验收**：旧链接可用；新模型稳定；回归通过。

---

## 9. 变更清单（代码位点）

- `src/app.tsx`：移除旧动态注入，接入新菜单构建器
- `config/routes.ts`：新增 `/system/functions/workspaces*` 路由与兼容重定向
- `src/features/navigation/*`：新增菜单构建模块
- `src/pages/Workspaces/*`：新增对象工作台页面
- `src/locales/*/menu.ts`：新增对象工作台文案

---

## 10. 测试与发布标准

最低测试：

1. 登录后菜单能根据权限显示对象入口。
2. 切换 game/env 后对象入口和页面数据同步刷新。
3. 对象工作台 single 模式可执行多 operation。
4. tabbed 模式下 section 编排生效。
5. 旧链接访问能重定向到新入口。

发布门槛：

- 功能回归通过
- 无新增 401/403 死链
- 无“函数目录”暴露在主导航

---

## 11. 风险与回滚

风险：

- descriptor 数据质量不稳定导致对象聚合异常
- 大量 operation 渲染性能波动

回滚：

- 保留 `legacyDynamicMenu` 开关
- 路由层可一键回切旧入口

---

## 12. 变更记录

- 2026-03-04：初版冻结。
