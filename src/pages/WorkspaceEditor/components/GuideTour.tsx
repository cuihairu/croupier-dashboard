/**
 * 新手引导流程组件
 *
 * 首次使用时显示引导，分步骤介绍核心功能。
 *
 * @module pages/WorkspaceEditor/components/GuideTour
 */

import React, { useState, useEffect, useRef } from 'react';
import { Tour, Button, Space } from 'antd';
import {
  SaveOutlined,
  AppstoreOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

export interface GuideTourProps {
  visible: boolean;
  onClose: () => void;
  currentStep?: number;
  onStepChange?: (current: number) => void;
}

/** 引导步骤配置 */
const TOUR_STEPS = [
  {
    target: () => document.querySelector('.ant-pro-page-container'),
    title: '欢迎使用 Workspace 配置编辑器',
    description:
      '这是一个强大的可视化配置工具，帮助你快速构建和管理 Workspace 配置。让我们快速了解核心功能。',
  },
  {
    target: () => document.querySelector('[class*="FunctionList"]'),
    title: '函数库',
    description:
      '左侧面板列出了所有可用的函数。你可以拖拽函数到配置区，或使用搜索和过滤功能快速找到需要的函数。',
    placement: 'right',
  },
  {
    target: () => document.querySelector('[class*="LayoutDesigner"]'),
    title: '布局设计器',
    description:
      '中间区域是配置的核心，支持多种布局类型：列表、表单、详情、看板等。选择合适的布局类型后，可以配置列、字段等详细信息。',
    placement: 'right',
  },
  {
    target: () => document.querySelector('[class*="ConfigPreview"]'),
    title: '实时预览',
    description:
      '右侧面板可以实时预览配置效果。在编辑时，预览区会自动更新，帮助你快速确认配置是否符合预期。',
    placement: 'left',
  },
  {
    target: () => document.querySelector('.ant-pro-page-container button[icon*="save"]'),
    title: '保存配置',
    description:
      '编辑完成后，点击保存按钮将配置持久化。系统会自动校验配置，确保数据完整性和正确性。',
    placement: 'bottom',
  },
  {
    target: () => document.querySelector('button[class*="template"]'),
    title: '模板功能',
    description:
      '不确定从哪里开始？试试模板功能！我们提供了预置的配置模板，可以快速创建常用的布局结构。',
    placement: 'bottom',
  },
  {
    target: () => document.querySelector('button[class*="performance"]'),
    title: '性能分析',
    description:
      '想要了解配置的性能表现？点击性能按钮查看详细分析报告，包括字段数量、复杂度评分和优化建议。',
    placement: 'bottom',
  },
  {
    target: () => document.querySelector('button[icon*="question"]'),
    title: '帮助文档',
    description: '遇到问题？点击问号图标查看详细的配置说明和示例，每个配置项都有对应的帮助文档。',
    placement: 'bottom',
  },
];

/** 检查引导是否已完成 */
const GUIDE_COMPLETED_KEY = 'workspace:guide:completed';

function isGuideCompleted(): boolean {
  try {
    return localStorage.getItem(GUIDE_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

function markGuideCompleted(): void {
  try {
    localStorage.setItem(GUIDE_COMPLETED_KEY, 'true');
  } catch {
    // ignore
  }
}

/** 检查是否应该显示引导 */
export function shouldShowGuide(isFirstVisit?: boolean): boolean {
  return isFirstVisit || !isGuideCompleted();
}

/**
 * 新手引导 Tour 组件
 */
export default function GuideTour({
  visible,
  onClose,
  currentStep = 0,
  onStepChange,
}: GuideTourProps) {
  const [tourOpen, setTourOpen] = useState(visible);

  useEffect(() => {
    setTourOpen(visible);
  }, [visible]);

  const handleClose = () => {
    setTourOpen(false);
    // 完成引导
    if (currentStep === TOUR_STEPS.length - 1) {
      markGuideCompleted();
    }
    onClose();
  };

  const steps = TOUR_STEPS.map((step, index) => ({
    ...step,
    target: index === 0 || !step.target ? () => document.body : step.target,
  }));

  return (
    <Tour
      open={tourOpen}
      onClose={handleClose}
      onChange={(current) => {
        onStepChange?.(current);
      }}
      steps={steps}
      current={currentStep}
      zIndex={2000}
      closeIcon={<CheckCircleOutlined />}
      nextButtonProps={{
        children: currentStep === TOUR_STEPS.length - 1 ? '完成' : '下一步',
      }}
    />
  );
}

/**
 * 快速引导按钮（首次使用时显示）
 */
export interface QuickGuideButtonProps {
  onStart: () => void;
}

export function QuickGuideButton({ onStart }: QuickGuideButtonProps) {
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isCompleted = isGuideCompleted();

  // 如果已完成或已关闭，不显示
  if (isCompleted || dismissed) return null;

  // 延迟显示，避免页面加载时立即弹出
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasBeenShown) {
        setShow(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [hasBeenShown]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: 'flex',
        gap: 8,
        animation: 'fadeInUp 0.3s ease-out',
      }}
    >
      <Button
        type="primary"
        size="large"
        icon={<CheckCircleOutlined />}
        onClick={() => {
          setHasBeenShown(true);
          onStart();
        }}
      >
        开始引导
      </Button>
      <Button
        size="large"
        onClick={() => {
          setDismissed(true);
          markGuideCompleted();
        }}
      >
        跳过
      </Button>
    </div>
  );
}
