# Formily Schema V1 (Draft)

> 目标：用于函数 UI 配置的统一 Schema 标准，兼容 Formily JSON Schema 与 Ant Design v5 组件。

## 版本

- `version`: `formily:1`

## 基础结构

```json
{
  "type": "object",
  "properties": {
    "fieldA": {
      "type": "string",
      "title": "字段标题",
      "x-decorator": "FormItem",
      "x-component": "Input"
    }
  }
}
```

## 常用字段

- `type`: JSON Schema 类型（string/number/boolean/object/array）
- `title`: 展示标题
- `description`: 描述文案
- `default`: 默认值
- `enum`: 枚举值数组（与 `x-component` 搭配 Select/Radio）
- `required`: 必填字段列表（位于父级对象）

## Formily 扩展字段（推荐）

- `x-decorator`: 统一用 `FormItem`
- `x-component`: 组件名（Input/Select/NumberPicker/Switch/DatePicker/ArrayTable/ArrayItems）
- `x-component-props`: 组件 props
- `x-decorator-props`: FormItem props
- `x-validator`: 校验规则数组
- `x-reactions`: 联动规则
- `x-visible` / `x-hidden` / `x-disabled` / `x-readonly`: 运行态控制

## 布局建议

- 表单整体使用 `Form` + `FormItem`
- 复杂区域使用 `Card` / `Space` / `ArrayTable`
- 多分组可用 `properties` 下的 `object` 分块

## 迁移说明

- 历史 UI Schema 需转换为 Formily Schema
- 保留转换器入口：`src/services/schema/convertLegacySchemaToFormily.ts`

## 异步联动（示例思路）

- 运行时提供 `scope.fetchOptions(url, params)`，可在 `x-reactions` 中调用以动态填充枚举。
