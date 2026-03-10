import React, { useState, useMemo, useEffect } from 'react';
import { Space, Card, Modal, message, Button } from 'antd';
import type { TabConfig, ColumnConfig, FieldConfig } from '@/types/workspace';
import type { FunctionDescriptor } from '@/services/api/functions';
import { descriptorToLayout } from '../utils/schemaToLayout';
import TabBasicInfo from './TabEditor/TabBasicInfo';
import TabFunctionManager from './TabEditor/TabFunctionManager';
import LayoutTypeSelector from './TabEditor/LayoutTypeSelector';
import OrchestrationWizard from './TabEditor/OrchestrationWizard';
import ColumnEditorModal from './TabEditor/ColumnEditorModal';
import FieldEditorModal from './TabEditor/FieldEditorModal';
import LayoutConfigRenderer from './TabEditor/LayoutConfigRenderer';
import {
  createDefaultLayout,
  buildOrchestrationLayout,
  buildDefaultOrchestratorBindings,
  getRolesForOrchestratorMode,
  mergeLayoutByMissing,
  buildLayoutDiffPreview,
  buildOrchestrationRiskTips,
  assessOrchestrationRiskLevel,
  type OrchestratorBindings,
} from './TabEditor/orchestrationUtils';
import {
  detectRecommendedScenario,
  createScenarioLayout,
  type ScenarioRecommendation,
} from './TabEditor/scenarioUtils';
import { healTabLayoutWithTemplate } from './TabEditor/healLayoutUtils';
import { useOrchestrationHistory } from './TabEditor/useOrchestrationHistory';

type OrchestratorMode = 'list' | 'form-detail' | 'split' | 'dashboard';
type OrchestratorRole = 'list' | 'detail' | 'submit' | 'query' | 'data';
type OrchestratorApplyMode = 'overwrite' | 'merge';
type QuickLayoutMode = 'list' | 'form' | 'detail' | 'form-detail';

export interface TabEditorProps {
  tab: TabConfig;
  onChange: (tab: TabConfig) => void;
  descriptors?: FunctionDescriptor[];
}

export default function TabEditor({ tab, onChange, descriptors = [] }: TabEditorProps) {
  // State
  const [editingColumn, setEditingColumn] = useState<ColumnConfig | null>(null);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [layoutWizardDescriptor, setLayoutWizardDescriptor] = useState<FunctionDescriptor | null>(
    null,
  );
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [orchestratorMode, setOrchestratorMode] = useState<OrchestratorMode>('form-detail');
  const [orchestratorBindings, setOrchestratorBindings] = useState<OrchestratorBindings | null>(
    null,
  );
  const [orchestratorApplyMode, setOrchestratorApplyMode] =
    useState<OrchestratorApplyMode>('overwrite');

  // Safe tab with defaults
  const safeTab = {
    ...tab,
    functions: tab?.functions || [],
    layout: tab?.layout || { type: 'form' },
  };

  const {
    undoStack: orchestratorUndoStack,
    redoStack: orchestratorRedoStack,
    pushToHistory: pushOrchestrationHistory,
    undo: undoOrchestration,
    redo: redoOrchestration,
    clearRedoStack,
  } = useOrchestrationHistory({
    maxStackSize: 10,
    onLayoutChange: (layout) => onChange({ ...safeTab, layout }),
    getCurrentLayout: () => safeTab.layout,
    enableHotkeys: true,
  });

  // Handlers
  const handleBasicChange = (field: string, value: any) => {
    onChange({ ...safeTab, [field]: value });
  };

  const handleLayoutTypeChange = (type: string) => {
    const primaryFunctionId = safeTab.functions[0];
    const primaryDescriptor = descriptors.find((d) => d.id === primaryFunctionId);
    const defaultLayout = createDefaultLayout(type, primaryFunctionId, primaryDescriptor);
    onChange({ ...safeTab, layout: defaultLayout });
  };

  const handleApplyScenario = (scenarioId: string) => {
    const primaryFunctionId = safeTab.functions[0] || '';
    const scenarioLayout = createScenarioLayout(scenarioId, primaryFunctionId);
    if (!scenarioLayout) {
      message.warning('未识别的场景模板');
      return;
    }
    onChange({ ...safeTab, layout: scenarioLayout });
    message.success('已应用场景模板');
  };

  const handleAutoLayout = () => {
    if (safeTab.functions.length === 0) {
      message.warning('请先添加函数');
      return;
    }
    const firstFuncId = safeTab.functions[0];
    const descriptor = descriptors.find((d) => d.id === firstFuncId);
    if (!descriptor) {
      message.warning('未找到函数描述符，无法自动推导');
      return;
    }
    const autoLayout = descriptorToLayout(descriptor);
    onChange({ ...safeTab, layout: autoLayout });
    message.success(`已自动生成 ${autoLayout.type} 布局`);
  };

  const handleHealLayout = () => {
    const nextTab = healTabLayoutWithTemplate(safeTab, descriptors);
    onChange(nextTab);
    message.success('已补全当前布局缺失配置');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const funcData = e.dataTransfer.getData('function');
    if (!funcData) return;
    try {
      const func: FunctionDescriptor = JSON.parse(funcData);
      if (!safeTab.functions.includes(func.id)) {
        const newFunctions = [...safeTab.functions, func.id];
        if (safeTab.functions.length === 0) {
          const autoLayout = descriptorToLayout(func);
          onChange({ ...safeTab, functions: newFunctions, layout: autoLayout });
          message.success(`已添加函数并自动生成 ${autoLayout.type} 布局`);
        } else {
          const nextTab = healTabLayoutWithTemplate(
            { ...safeTab, functions: newFunctions },
            descriptors,
          );
          onChange(nextTab);
          message.success('函数已添加并自动补全布局缺失配置');
        }
      } else {
        message.warning('函数已存在');
      }
    } catch {
      message.error('添加函数失败');
    }
  };

  const handleRemoveFunction = (functionId: string) => {
    const nextFunctions = safeTab.functions.filter((f) => f !== functionId);
    const nextLayout = { ...(safeTab.layout as any) };
    if (nextLayout.listFunction === functionId) nextLayout.listFunction = '';
    if (nextLayout.submitFunction === functionId) nextLayout.submitFunction = '';
    if (nextLayout.detailFunction === functionId) nextLayout.detailFunction = '';
    if (nextLayout.queryFunction === functionId) nextLayout.queryFunction = '';
    const nextTab = healTabLayoutWithTemplate(
      { ...safeTab, functions: nextFunctions, layout: nextLayout },
      descriptors,
    );
    onChange(nextTab);
  };

  const handleApplyFunctionLayout = (descriptor: FunctionDescriptor, mode: QuickLayoutMode) => {
    const layout = createDefaultLayout(mode, descriptor.id, descriptor);
    const nextFunctions = safeTab.functions.includes(descriptor.id)
      ? safeTab.functions
      : [...safeTab.functions, descriptor.id];
    onChange({ ...safeTab, functions: nextFunctions, layout });
    setLayoutWizardDescriptor(null);
    message.success(`已基于 ${descriptor.display_name?.zh || descriptor.id} 生成 ${mode} 布局`);
  };

  // Orchestration
  const orchestrationPlan = useMemo(
    () =>
      buildOrchestrationLayout(
        orchestratorMode,
        safeTab.functions,
        descriptors,
        orchestratorBindings,
      ),
    [orchestratorMode, safeTab.functions, descriptors, orchestratorBindings],
  );

  const defaultBindings = useMemo(
    () => buildDefaultOrchestratorBindings(safeTab.functions, descriptors),
    [safeTab.functions, descriptors],
  );

  useEffect(() => {
    if (!orchestratorOpen) return;
    setOrchestratorBindings(defaultBindings);
  }, [orchestratorOpen, defaultBindings]);

  const activeOrchestratorRoles = useMemo(
    () => getRolesForOrchestratorMode(orchestratorMode),
    [orchestratorMode],
  );

  const invalidOrchestratorRoles = useMemo(() => {
    if (!orchestratorBindings) return [] as OrchestratorRole[];
    const functionSet = new Set(safeTab.functions);
    return activeOrchestratorRoles.filter(
      (role) => !functionSet.has(orchestratorBindings[role]),
    ) as OrchestratorRole[];
  }, [orchestratorBindings, safeTab.functions, activeOrchestratorRoles]);

  const displayedAssignments = useMemo(() => {
    if (!orchestrationPlan) return [];
    const prefixes = new Set(activeOrchestratorRoles.map((r) => `${r} -> `));
    return orchestrationPlan.assignments.filter((line) =>
      Array.from(prefixes).some((prefix) => line.startsWith(prefix)),
    );
  }, [orchestrationPlan, activeOrchestratorRoles]);

  const previewNextLayout = useMemo(() => {
    if (!orchestrationPlan) return null;
    return orchestratorApplyMode === 'merge'
      ? mergeLayoutByMissing(safeTab.layout as any, orchestrationPlan.layout)
      : orchestrationPlan.layout;
  }, [orchestrationPlan, orchestratorApplyMode, safeTab.layout]);

  const layoutDiffPreview = useMemo(() => {
    if (!previewNextLayout) return [];
    return buildLayoutDiffPreview(safeTab.layout as any, previewNextLayout);
  }, [previewNextLayout, safeTab.layout]);

  const orchestrationRiskTips = useMemo(
    () =>
      buildOrchestrationRiskTips(
        orchestratorApplyMode,
        safeTab.layout as any,
        previewNextLayout,
        layoutDiffPreview,
      ),
    [orchestratorApplyMode, safeTab.layout, previewNextLayout, layoutDiffPreview],
  );

  const handleApplyOrchestration = () => {
    if (!orchestrationPlan) {
      message.warning('当前函数不足，无法生成编排方案');
      return;
    }
    if (invalidOrchestratorRoles.length > 0) {
      message.warning(`存在失效角色绑定: ${invalidOrchestratorRoles.join(', ')}，请先调整`);
      return;
    }
    const riskLevel = assessOrchestrationRiskLevel(
      orchestratorApplyMode,
      safeTab.layout as any,
      previewNextLayout,
      layoutDiffPreview,
    );
    const doApply = () => {
      pushOrchestrationHistory(safeTab.layout);
      const nextLayout =
        orchestratorApplyMode === 'merge'
          ? mergeLayoutByMissing(safeTab.layout as any, orchestrationPlan.layout)
          : orchestrationPlan.layout;
      onChange({ ...safeTab, layout: nextLayout });
      setOrchestratorOpen(false);
      message.success(
        `已应用多函数编排：${orchestratorMode}（${
          orchestratorApplyMode === 'merge' ? '仅补空字段' : '覆盖当前'
        }）`,
      );
    };

    if (riskLevel === 'high') {
      Modal.confirm({
        title: '高风险变更确认',
        content: '本次编排将产生高影响改动（覆盖/关键绑定变化/布局切换），确认继续应用？',
        okText: '确认应用',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: doApply,
      });
      return;
    }

    if (riskLevel === 'medium') {
      Modal.confirm({
        title: '变更确认',
        content: '本次编排将更新当前布局配置，是否继续？',
        okText: '继续',
        cancelText: '取消',
        onOk: doApply,
      });
      return;
    }

    doApply();
  };

  const handleUndoOrchestration = () => {
    undoOrchestration(safeTab.layout);
  };

  const handleRedoOrchestration = () => {
    redoOrchestration(safeTab.layout);
  };

  // Clear redo stack on external layout change
  useEffect(() => {
    if (orchestratorRedoStack.length > 0) {
      const lastRedo = orchestratorRedoStack[orchestratorRedoStack.length - 1];
      if (JSON.stringify(lastRedo) === JSON.stringify(safeTab.layout)) {
        return;
      }
      clearRedoStack();
    }
  }, [safeTab.layout, orchestratorRedoStack, clearRedoStack]);

  // Scenario recommendation
  const recommendedScenario = useMemo((): ScenarioRecommendation | null => {
    const funcDescriptors = safeTab.functions
      .map((id) => descriptors.find((d) => d.id === id))
      .filter(Boolean) as FunctionDescriptor[];
    if (funcDescriptors.length === 0) return null;
    return detectRecommendedScenario(funcDescriptors);
  }, [safeTab.functions, descriptors]);

  // Column/Field editor handlers
  const handleColumnSave = (values: ColumnConfig) => {
    const layout = safeTab.layout as any;
    const cols: ColumnConfig[] = layout.columns || [];
    if (editingColumn) {
      onChange({
        ...safeTab,
        layout: {
          ...layout,
          columns: cols.map((c) => (c.key === editingColumn.key ? { ...c, ...values } : c)),
        },
      });
    } else {
      onChange({ ...safeTab, layout: { ...layout, columns: [...cols, values] } });
    }
    setColumnModalOpen(false);
    setEditingColumn(null);
  };

  const handleFieldSave = (values: FieldConfig) => {
    const layout = safeTab.layout as any;
    const fieldsKey = layout.type === 'form' ? 'fields' : 'queryFields';
    const fields: FieldConfig[] = layout[fieldsKey] || [];
    if (editingField) {
      onChange({
        ...safeTab,
        layout: {
          ...layout,
          [fieldsKey]: fields.map((f) => (f.key === editingField.key ? { ...f, ...values } : f)),
        },
      });
    } else {
      onChange({ ...safeTab, layout: { ...layout, [fieldsKey]: [...fields, values] } });
    }
    setFieldModalOpen(false);
    setEditingField(null);
  };

  const handleOpenColumnEditor = (column: ColumnConfig | null) => {
    setEditingColumn(column);
    setColumnModalOpen(true);
  };

  const handleOpenFieldEditor = (field: FieldConfig | null) => {
    setEditingField(field);
    setFieldModalOpen(true);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <TabBasicInfo tab={safeTab} onChange={handleBasicChange} />

      <TabFunctionManager
        tab={safeTab}
        descriptors={descriptors}
        onDrop={handleDrop}
        onRemoveFunction={handleRemoveFunction}
        onOpenLayoutWizard={setLayoutWizardDescriptor}
      />

      <Modal
        title={`界面向导: ${
          layoutWizardDescriptor?.display_name?.zh || layoutWizardDescriptor?.id || ''
        }`}
        open={!!layoutWizardDescriptor}
        footer={null}
        onCancel={() => setLayoutWizardDescriptor(null)}
      >
        {layoutWizardDescriptor && (
          <Space wrap>
            <Button onClick={() => handleApplyFunctionLayout(layoutWizardDescriptor, 'list')}>
              生成列表界面
            </Button>
            <Button onClick={() => handleApplyFunctionLayout(layoutWizardDescriptor, 'form')}>
              生成表单界面
            </Button>
            <Button onClick={() => handleApplyFunctionLayout(layoutWizardDescriptor, 'detail')}>
              生成详情界面
            </Button>
            <Button
              onClick={() => handleApplyFunctionLayout(layoutWizardDescriptor, 'form-detail')}
            >
              生成查询详情界面
            </Button>
          </Space>
        )}
      </Modal>

      <LayoutTypeSelector
        layoutType={safeTab.layout.type}
        functions={safeTab.functions}
        descriptors={descriptors}
        recommendedScenario={recommendedScenario}
        undoStackLength={orchestratorUndoStack.length}
        redoStackLength={orchestratorRedoStack.length}
        onLayoutTypeChange={handleLayoutTypeChange}
        onApplyScenario={handleApplyScenario}
        onAutoLayout={handleAutoLayout}
        onHealLayout={handleHealLayout}
        onOpenOrchestrator={() => setOrchestratorOpen(true)}
        onUndo={handleUndoOrchestration}
        onRedo={handleRedoOrchestration}
      />

      <OrchestrationWizard
        open={orchestratorOpen}
        mode={orchestratorMode}
        applyMode={orchestratorApplyMode}
        bindings={orchestratorBindings}
        functions={safeTab.functions}
        descriptors={descriptors}
        orchestrationPlan={orchestrationPlan}
        activeRoles={activeOrchestratorRoles}
        invalidRoles={invalidOrchestratorRoles}
        defaultBindings={defaultBindings}
        displayedAssignments={displayedAssignments}
        riskTips={orchestrationRiskTips}
        diffPreview={layoutDiffPreview}
        onClose={() => setOrchestratorOpen(false)}
        onApply={handleApplyOrchestration}
        onModeChange={setOrchestratorMode}
        onApplyModeChange={setOrchestratorApplyMode}
        onBindingsChange={setOrchestratorBindings}
        onResetBindings={() => setOrchestratorBindings(defaultBindings)}
      />

      <Card title="布局配置" size="small">
        <LayoutConfigRenderer
          layout={safeTab.layout}
          tab={safeTab}
          descriptors={descriptors}
          onTabChange={onChange}
          onOpenColumnEditor={handleOpenColumnEditor}
          onOpenFieldEditor={handleOpenFieldEditor}
        />
      </Card>

      <ColumnEditorModal
        open={columnModalOpen}
        editingColumn={editingColumn}
        onOk={handleColumnSave}
        onCancel={() => {
          setColumnModalOpen(false);
          setEditingColumn(null);
        }}
      />

      <FieldEditorModal
        open={fieldModalOpen}
        editingField={editingField}
        onOk={handleFieldSave}
        onCancel={() => {
          setFieldModalOpen(false);
          setEditingField(null);
        }}
      />
    </Space>
  );
}
