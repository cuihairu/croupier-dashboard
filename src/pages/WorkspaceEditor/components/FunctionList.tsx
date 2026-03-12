/**
 * 函数列表组件
 *
 * 显示可用的函数列表，支持拖拽到布局设计器。
 * 支持拖拽排序、插入位置指示、自动展开分组、自动滚动。
 *
 * @module pages/WorkspaceEditor/components/FunctionList
 */

import React, { useRef, useEffect } from 'react';
import { Card, List, Tag, Typography, Input, Button, Tooltip, Select, Space, Collapse } from 'antd';
import {
  SearchOutlined,
  MenuFoldOutlined,
  FilterOutlined,
  AppstoreOutlined,
  StarOutlined,
  StarFilled,
  HolderOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDndContext,
  CollisionDetection,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface FunctionListProps {
  functions: any[];
  onCollapse?: () => void;
}

const OPERATION_COLOR: Record<string, string> = {
  list: '#1677ff',
  query: '#52c41a',
  create: '#13c2c2',
  update: '#fa8c16',
  delete: '#ff4d4f',
  action: '#722ed1',
  read: '#52c41a',
  custom: '#eb2f96',
};

const OPERATION_TAG_COLOR: Record<string, string> = {
  list: 'blue',
  query: 'green',
  create: 'cyan',
  update: 'orange',
  delete: 'red',
  action: 'purple',
  read: 'green',
  custom: 'magenta',
};

// 根据 entity 生成稳定的背景色（浅色）
const ENTITY_BG_COLORS = [
  '#f0f5ff',
  '#f6ffed',
  '#fff7e6',
  '#fff0f6',
  '#f9f0ff',
  '#e6fffb',
  '#fffbe6',
  '#fff1f0',
  '#fcffe6',
  '#e6f4ff',
];

function entityColorIndex(entity?: string): number {
  if (!entity) return 0;
  let hash = 0;
  for (let i = 0; i < entity.length; i++) hash = (hash * 31 + entity.charCodeAt(i)) & 0xffff;
  return hash % ENTITY_BG_COLORS.length;
}

const STORAGE_KEY_GROUP_MODE = 'workspace:functionList:groupByEntity';
const STORAGE_KEY_COLLAPSED = 'workspace:functionList:collapsedGroups';
const STORAGE_KEY_RECENT = 'workspace:functionList:recentFunctions';
const STORAGE_KEY_FAVORITES = 'workspace:functionList:favorites';
const STORAGE_KEY_SORTED_ORDER = 'workspace:functionList:sortedOrder';
const MAX_RECENT = 10;

// 自动滚动阈值（距离边缘多少像素开始滚动）
const SCROLL_THRESHOLD = 50;
// 自动滚动速度
const SCROLL_SPEED = 5;

// 自定义碰撞检测：支持跨分组和展开折叠的分组
function customCollisionDetection(args: any): any {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return closestCenter(args);
}

// 可排序函数项
interface SortableFunctionItemProps {
  func: any;
  favoriteSet: Set<string>;
  onToggleFavorite: (id: string) => void;
  isDragging?: boolean;
}

function SortableFunctionItem({ func, favoriteSet, onToggleFavorite }: SortableFunctionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, over } =
    useSortable({
      id: func.id,
    });

  const op = func.operation || 'custom';
  const borderColor = OPERATION_COLOR[op] || '#d9d9d9';
  const bgColor = ENTITY_BG_COLORS[entityColorIndex(func.entity || func.category)];
  const tagColor = OPERATION_TAG_COLOR[op] || 'default';
  const isFav = favoriteSet.has(func.id);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    padding: '10px 12px',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: bgColor,
    borderLeft: `4px solid ${borderColor}`,
    border: `1px solid ${borderColor}22`,
    borderLeftWidth: 4,
    position: 'relative',
    // 拖拽时高亮目标位置
    boxShadow: over && !isDragging ? `0 0 0 2px ${borderColor}` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px ${borderColor}44`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging && !over) {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }
      }}
    >
      <div
        style={{ position: 'absolute', top: 6, right: 6, cursor: 'pointer', zIndex: 1 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(func.id);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isFav ? (
          <StarFilled style={{ color: '#faad14' }} />
        ) : (
          <StarOutlined style={{ color: '#999' }} />
        )}
      </div>
      {/* 拖拽手柄 */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          cursor: 'grab',
          color: '#999',
          opacity: 0.5,
        }}
      >
        <HolderOutlined />
      </div>
      <div style={{ marginLeft: 16 }}>
        <Typography.Text strong style={{ fontSize: 13 }}>
          {func.display_name?.zh || func.id}
        </Typography.Text>
        <div style={{ marginTop: 2 }}>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 11, display: 'block', marginBottom: 4 }}
            ellipsis
          >
            {func.id}
          </Typography.Text>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {op && (
              <Tag color={tagColor} style={{ margin: 0, fontSize: 11 }}>
                {op}
              </Tag>
            )}
            {func.entity && (
              <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
                {func.entity}
              </Tag>
            )}
            {func.category && !func.entity && (
              <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
                {func.category}
              </Tag>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 拖拽预览组件
function DragOverlayItem({ func, favoriteSet }: { func: any; favoriteSet: Set<string> }) {
  if (!func) return null;
  const op = func.operation || 'custom';
  const borderColor = OPERATION_COLOR[op] || '#d9d9d9';
  const bgColor = ENTITY_BG_COLORS[entityColorIndex(func.entity || func.category)];
  const tagColor = OPERATION_TAG_COLOR[op] || 'default';

  return (
    <div
      style={{
        cursor: 'grabbing',
        padding: '10px 12px',
        borderRadius: 6,
        backgroundColor: bgColor,
        borderLeft: `4px solid ${borderColor}`,
        border: `1px solid ${borderColor}`,
        borderLeftWidth: 4,
        position: 'relative',
        boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
        opacity: 0.9,
        transform: 'rotate(3deg)',
      }}
    >
      <div style={{ marginLeft: 0 }}>
        <Typography.Text strong style={{ fontSize: 13 }}>
          {func.display_name?.zh || func.id}
        </Typography.Text>
        <div style={{ marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {op && (
              <Tag color={tagColor} style={{ margin: 0, fontSize: 11 }}>
                {op}
              </Tag>
            )}
            {func.entity && (
              <Tag color="default" style={{ margin: 0, fontSize: 11 }}>
                {func.entity}
              </Tag>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function loadGroupMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_GROUP_MODE) === 'true';
  } catch {
    return false;
  }
}
function saveGroupMode(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY_GROUP_MODE, String(v));
  } catch {
    /* noop */
  }
}
function loadCollapsedGroups(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_COLLAPSED) || '[]');
  } catch {
    return [];
  }
}
function saveCollapsedGroups(v: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(v));
  } catch {
    /* noop */
  }
}
function loadRecentFunctions(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_RECENT) || '[]');
  } catch {
    return [];
  }
}
function addRecentFunction(funcId: string) {
  try {
    const recent = loadRecentFunctions().filter((id) => id !== funcId);
    recent.unshift(funcId);
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    /* noop */
  }
}
function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_FAVORITES) || '[]');
  } catch {
    return [];
  }
}
function saveFavorites(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(ids));
  } catch {
    /* noop */
  }
}

// 加载/保存排序后的顺序
function loadSortedOrder(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SORTED_ORDER) || '{}');
  } catch {
    return {};
  }
}
function saveSortedOrder(order: Record<string, string[]>) {
  try {
    localStorage.setItem(STORAGE_KEY_SORTED_ORDER, JSON.stringify(order));
  } catch {
    /* noop */
  }
}

// 按保存的顺序对函数进行排序
function applySortedOrder(functions: any[], groupKey: string): any[] {
  const order = loadSortedOrder();
  const groupOrder = order[groupKey] || [];
  const ordered: any[] = [];
  const remaining = [...functions];

  // 先放已排序的
  groupOrder.forEach((id) => {
    const idx = remaining.findIndex((f) => f.id === id);
    if (idx !== -1) {
      ordered.push(...remaining.splice(idx, 1));
    }
  });

  // 再放未排序的
  return [...ordered, ...remaining];
}

export default function FunctionList({ functions, onCollapse }: FunctionListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchText, setSearchText] = React.useState('');
  const [operationFilter, setOperationFilter] = React.useState<string>('');
  const [entityFilter, setEntityFilter] = React.useState<string>('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [groupByEntity, setGroupByEntity] = React.useState(loadGroupMode);
  const [collapsedGroups, setCollapsedGroups] = React.useState<string[]>(loadCollapsedGroups);
  const [recentIds, setRecentIds] = React.useState<string[]>(loadRecentFunctions);
  const [favoriteIds, setFavoriteIds] = React.useState<string[]>(loadFavorites);
  const [sortedFunctions, setSortedFunctions] = React.useState<any[]>(functions);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overGroup, setOverGroup] = React.useState<string | null>(null);

  // 自动滚动相关状态
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 清除自动滚动
  const clearAutoScroll = React.useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // 自动滚动逻辑
  const handleAutoScroll = React.useCallback(
    (y: number) => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // 距离顶部的距离
      const distFromTop = y - rect.top;
      // 距离底部的距离
      const distFromBottom = rect.bottom - y;

      clearAutoScroll();

      // 接近顶部，向上滚动
      if (distFromTop < SCROLL_THRESHOLD && scrollTop > 0) {
        scrollIntervalRef.current = setInterval(() => {
          if (container.scrollTop > 0) {
            container.scrollTop -= SCROLL_SPEED;
          } else {
            clearAutoScroll();
          }
        }, 16);
      }
      // 接近底部，向下滚动
      else if (distFromBottom < SCROLL_THRESHOLD && scrollTop + clientHeight < scrollHeight) {
        scrollIntervalRef.current = setInterval(() => {
          if (container.scrollTop + clientHeight < scrollHeight) {
            container.scrollTop += SCROLL_SPEED;
          } else {
            clearAutoScroll();
          }
        }, 16);
      }
    },
    [clearAutoScroll],
  );

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 避免误触
      },
    }),
  );

  // 初始化排序后的函数列表
  React.useEffect(() => {
    if (!groupByEntity) {
      const allOrder = loadSortedOrder();
      setSortedFunctions(applySortedOrder(functions, '__all__'));
    } else {
      setSortedFunctions(functions);
    }
  }, [functions, groupByEntity]);

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // 拖拽移动（处理自动滚动和自动展开分组）
  const handleDragMove = (event: any) => {
    const { active, over } = event;
    if (!active) return;

    // 处理自动滚动
    handleAutoScroll(event.activatorEvent.clientY);

    // 处理自动展开分组
    if (over && over.data?.current?.type === 'group') {
      const groupKey = over.data.current.groupKey;
      if (collapsedGroups.includes(groupKey)) {
        setOverGroup(groupKey);
      } else {
        setOverGroup(null);
      }
    } else {
      setOverGroup(null);
    }
  };

  // 延迟展开分组
  React.useEffect(() => {
    if (overGroup) {
      const timer = setTimeout(() => {
        setCollapsedGroups((prev) => prev.filter((g) => g !== overGroup));
        setOverGroup(null);
      }, 500); // 停留500ms后展开
      return () => clearTimeout(timer);
    }
  }, [overGroup]);

  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverGroup(null);
    clearAutoScroll();

    if (!over) return;

    // 如果是拖拽到外部（布局设计器），记录最近使用
    if (over.data?.current?.type === 'layout-designer') {
      const func = functions.find((f) => f.id === active.id);
      if (func) {
        addRecentFunction(func.id);
        setRecentIds(loadRecentFunctions());
      }
      return;
    }

    // 如果是拖拽排序
    if (active.id !== over.id) {
      const oldIndex = sortedFunctions.findIndex((f) => f.id === active.id);
      const newIndex = sortedFunctions.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSorted = arrayMove(sortedFunctions, oldIndex, newIndex);
        setSortedFunctions(newSorted);

        // 保存排序顺序
        if (!groupByEntity) {
          const order = loadSortedOrder();
          order['__all__'] = newSorted.map((f) => f.id);
          saveSortedOrder(order);
        }
      }
    }
  };

  // 拖拽取消
  const handleDragCancel = () => {
    setActiveId(null);
    setOverGroup(null);
    clearAutoScroll();
  };

  // 获取当前拖拽的函数
  const activeFunc = React.useMemo(() => {
    return activeId ? functions.find((f) => f.id === activeId) : null;
  }, [activeId, functions]);

  // 清理定时器
  React.useEffect(() => {
    return () => clearAutoScroll();
  }, [clearAutoScroll]);

  const toggleFavorite = (funcId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(funcId) ? prev.filter((id) => id !== funcId) : [...prev, funcId];
      saveFavorites(next);
      return next;
    });
  };

  const favoriteSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // 收藏的函数（仅展示当前可用的）
  const favoriteFunctions = React.useMemo(() => {
    const funcMap = new Map(functions.map((f: any) => [f.id, f]));
    return favoriteIds.map((id) => funcMap.get(id)).filter(Boolean);
  }, [favoriteIds, functions]);

  // 最近使用的函数（仅展示当前可用的）
  const recentFunctions = React.useMemo(() => {
    const funcMap = new Map(functions.map((f: any) => [f.id, f]));
    return recentIds.map((id) => funcMap.get(id)).filter(Boolean);
  }, [recentIds, functions]);

  // 提取可用的 operation 和 entity 选项
  const operationOptions = React.useMemo(() => {
    const ops = new Set<string>();
    functions.forEach((f) => {
      if (f.operation) ops.add(f.operation);
    });
    return Array.from(ops)
      .sort()
      .map((o) => ({ label: o, value: o }));
  }, [functions]);

  const entityOptions = React.useMemo(() => {
    const entities = new Set<string>();
    functions.forEach((f) => {
      if (f.entity) entities.add(f.entity);
    });
    return Array.from(entities)
      .sort()
      .map((e) => ({ label: e, value: e }));
  }, [functions]);

  const filteredFunctions = functions.filter((func) => {
    if (operationFilter && func.operation !== operationFilter) return false;
    if (entityFilter && func.entity !== entityFilter) return false;
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    return (
      func.id.toLowerCase().includes(text) ||
      func.display_name?.zh?.toLowerCase().includes(text) ||
      func.operation?.toLowerCase().includes(text) ||
      func.entity?.toLowerCase().includes(text) ||
      func.category?.toLowerCase().includes(text) ||
      (func.tags || []).some((t: string) => t.toLowerCase().includes(text))
    );
  });

  // 按 entity 分组
  const groupedFunctions = React.useMemo(() => {
    if (!groupByEntity) return null;
    const groups: Record<string, any[]> = {};
    filteredFunctions.forEach((func) => {
      const key = func.entity || func.category || '未分类';
      if (!groups[key]) groups[key] = [];
      groups[key].push(func);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredFunctions, groupByEntity]);

  const handleToggleGroupMode = (checked: boolean) => {
    setGroupByEntity(checked);
    saveGroupMode(checked);
  };

  const handleCollapseChange = (keys: string | string[]) => {
    const activeKeys = Array.isArray(keys) ? keys : [keys];
    // 存储折叠的（非活跃的）分组
    if (groupedFunctions) {
      const allKeys = groupedFunctions.map(([k]) => k);
      const collapsed = allKeys.filter((k) => !activeKeys.includes(k));
      setCollapsedGroups(collapsed);
      saveCollapsedGroups(collapsed);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Card
        title={
          <Space size={4}>
            <span>可用函数</span>
            <Tag>
              {filteredFunctions.length}/{functions.length}
            </Tag>
          </Space>
        }
        style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
        bodyStyle={{ height: 'calc(100% - 60px)', overflow: 'auto' }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Input
              placeholder="搜索函数/标签"
              prefix={<SearchOutlined />}
              size="small"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 120 }}
              allowClear
            />
            <Tooltip title="筛选">
              <Button
                type={showFilters || operationFilter || entityFilter ? 'primary' : 'text'}
                size="small"
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
                ghost={!!(operationFilter || entityFilter)}
                style={{ flexShrink: 0 }}
              />
            </Tooltip>
            {onCollapse && (
              <Tooltip title="收起">
                <Button
                  type="text"
                  size="small"
                  icon={<MenuFoldOutlined />}
                  onClick={onCollapse}
                  style={{ color: '#666', flexShrink: 0 }}
                />
              </Tooltip>
            )}
          </div>
        }
      >
        <div ref={containerRef} style={{ minHeight: 300 }}>
          {showFilters && (
            <div style={{ marginBottom: 8 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Select
                  size="small"
                  allowClear
                  placeholder="按操作类型筛选"
                  value={operationFilter || undefined}
                  onChange={(v) => setOperationFilter(v || '')}
                  options={operationOptions}
                  style={{ width: '100%' }}
                />
                <Select
                  size="small"
                  allowClear
                  placeholder="按实体筛选"
                  value={entityFilter || undefined}
                  onChange={(v) => setEntityFilter(v || '')}
                  options={entityOptions}
                  style={{ width: '100%' }}
                  showSearch
                />
                <Space size={4}>
                  <Tooltip title="按实体分组">
                    <Button
                      size="small"
                      type={groupByEntity ? 'primary' : 'default'}
                      icon={<AppstoreOutlined />}
                      onClick={() => handleToggleGroupMode(!groupByEntity)}
                    >
                      分组
                    </Button>
                  </Tooltip>
                </Space>
              </Space>
            </div>
          )}
          {/* 最近使用函数快捷区 */}
          {recentFunctions.length > 0 && !searchText && !operationFilter && !entityFilter && (
            <div style={{ marginBottom: 8 }}>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11, display: 'block', marginBottom: 4 }}
              >
                最近使用
              </Typography.Text>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {recentFunctions.slice(0, 6).map((func: any) => (
                  <Tag
                    key={func.id}
                    color={OPERATION_TAG_COLOR[func.operation] || 'default'}
                    style={{ cursor: 'grab', fontSize: 11 }}
                  >
                    {func.display_name?.zh || func.id}
                  </Tag>
                ))}
              </div>
            </div>
          )}
          {groupByEntity && groupedFunctions ? (
            <Collapse
              ghost
              defaultActiveKey={groupedFunctions
                .map(([k]) => k)
                .filter((k) => !collapsedGroups.includes(k))}
              onChange={handleCollapseChange}
            >
              {groupedFunctions.map(([entityKey, funcs]) => (
                <Collapse.Panel
                  key={entityKey}
                  header={
                    <Space size={4}>
                      <strong>{entityKey}</strong>
                      <Tag>{funcs.length}</Tag>
                      {overGroup === entityKey && (
                        <Tag color="blue" style={{ fontSize: 10 }}>
                          即将展开...
                        </Tag>
                      )}
                    </Space>
                  }
                >
                  <SortableContext
                    items={funcs.map((f: any) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {funcs.map((func: any) => (
                      <SortableFunctionItem
                        key={func.id}
                        func={func}
                        favoriteSet={favoriteSet}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </SortableContext>
                </Collapse.Panel>
              ))}
            </Collapse>
          ) : (
            <SortableContext
              items={filteredFunctions.map((f: any) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredFunctions.map((func: any) => (
                <SortableFunctionItem
                  key={func.id}
                  func={func}
                  favoriteSet={favoriteSet}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
              {filteredFunctions.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>暂无可用函数</div>
              )}
            </SortableContext>
          )}
          {/* 收藏函数区域 */}
          {favoriteFunctions.length > 0 && !searchText && !operationFilter && !entityFilter && (
            <div style={{ marginTop: 12, padding: '8px', background: '#f5f5f5', borderRadius: 6 }}>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11, display: 'block', marginBottom: 4 }}
              >
                <StarFilled style={{ color: '#faad14', marginRight: 4 }} />
                收藏夹
              </Typography.Text>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {favoriteFunctions.map((func: any) => (
                  <Tag
                    key={func.id}
                    color={OPERATION_TAG_COLOR[func.operation] || 'default'}
                    style={{ cursor: 'grab', fontSize: 11 }}
                  >
                    {func.display_name?.zh || func.id}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
      {/* 拖拽预览 */}
      <DragOverlay>
        <DragOverlayItem func={activeFunc} favoriteSet={favoriteSet} />
      </DragOverlay>
    </DndContext>
  );
}
