# 对象工作台迁移与回归清单

## 1. 路由兼容

- [x] `/system/functions` 重定向到 `/system/functions/workspaces`
- [x] `/system/functions/catalog` 重定向到 `/system/functions/workspaces`
- [x] `/console` 重定向到 `/system/functions/workspaces`
- [x] `/operations/audit` 重定向到 `/ops/audit`

## 2. 菜单行为

- [x] 游戏管理 > 函数管理下出现“对象工作台”入口
- [x] 左侧不再出现“函数目录”可见菜单项
- [x] 动态对象项点击进入 `/system/functions/workspaces/:objectKey`

## 3. 对象工作台功能

- [x] 同一对象操作在同一页面聚合展示
- [x] 支持单页模式（single）
- [x] 支持 Tab 模式（tabbed）
- [x] 支持分组编排（新增分组/操作归组）
- [x] 支持分组重命名/删除（并组）
- [x] 支持分组排序（上移/下移）
- [x] 支持操作排序（上移/下移）
- [x] 支持拖拽归组（操作拖入分组）
- [x] 支持操作显隐
- [x] 支持快速执行（JSON payload + invoke）
- [x] 编排配置可本地持久化（localStorage）

## 4. 手工回归用例

1. 登录后进入 `/system/functions/workspaces`，应自动跳转到首个对象详情。
2. 在对象详情页切换“单页/Tab”，刷新后模式保持。
3. 调整操作顺序并刷新，顺序保持。
4. 隐藏一个操作并刷新，隐藏状态保持。
5. 通过审批详情进入审计链接，地址应为 `/ops/audit?...`。
6. 直接访问旧路径 `/console`、`/system/functions/catalog`，应进入对象工作台。

## 5. 回滚开关（临时）

- 回滚策略：将 `/system/functions` 与 `/console` 重定向改回旧入口（`/system/functions/invoke`）。
- 回滚文件：`config/routes.ts`。
