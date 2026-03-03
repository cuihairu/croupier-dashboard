import React from 'react';
import {
  Alert,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from 'antd';
import type { PackItem } from './usePacksPage';

type Props = {
  open: boolean;
  selectedPack: PackItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function CanaryModal({ open, selectedPack, onClose, onSaved }: Props) {
  return (
    <Modal
      title="灰度发布配置"
      open={open}
      onCancel={onClose}
      onOk={() => {
        message.success('灰度配置已保存');
        onSaved();
      }}
      width={600}
    >
      {selectedPack && (
        <Form layout="vertical">
          <Form.Item label="包信息">
            <Space>
              <span>{selectedPack.name}</span>
              <Tag color="blue">{selectedPack.version}</Tag>
            </Space>
          </Form.Item>
          <Form.Item label="启用灰度发布" required>
            <Switch />
          </Form.Item>
          <Form.Item label="灰度比例 (%)" required>
            <Row gutter={16}>
              <Col span={12}>
                <Progress percent={10} />
              </Col>
              <Col span={12}>
                <InputNumber min={1} max={100} defaultValue={10} />
              </Col>
            </Row>
          </Form.Item>
          <Form.Item label="灰度规则" required>
            <Input.TextArea
              rows={4}
              placeholder='灰度规则配置 (JSON 格式):&#10;{&#10;  "game_id": "prefix:1000",&#10;  "user_id": "mod:10"&#10;}'
            />
          </Form.Item>
          <Form.Item label="灰度时长" required>
            <Select
              defaultValue="7d"
              options={[
                { label: '1 天', value: '1d' },
                { label: '3 天', value: '3d' },
                { label: '7 天', value: '7d' },
                { label: '14 天', value: '14d' },
                { label: '30 天', value: '30d' },
              ]}
            />
          </Form.Item>
          <Form.Item label="回滚策略">
            <Select
              defaultValue="auto"
              options={[
                { label: '自动回滚（错误率超阈值）', value: 'auto' },
                { label: '手动回滚', value: 'manual' },
                { label: '不回滚', value: 'none' },
              ]}
            />
          </Form.Item>
          <Alert
            message="灰度发布说明"
            description="灰度发布允许您将新版本先发布给一小部分用户，观察运行情况后再逐步推广到全部用户。"
            type="warning"
            showIcon
          />
        </Form>
      )}
    </Modal>
  );
}
