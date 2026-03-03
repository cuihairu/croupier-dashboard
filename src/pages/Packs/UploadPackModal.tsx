import React from 'react';
import { Alert, Descriptions, Modal, Space, Upload, message } from 'antd';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUpload: (file: any) => void;
};

export default function UploadPackModal({ open, onClose, onSuccess, onUpload }: Props) {
  return (
    <Modal
      title="上传包"
      open={open}
      onCancel={onClose}
      onOk={() => {
        message.success('包上传成功');
        onSuccess();
      }}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="上传说明"
          description="支持的包格式: .tgz (tar.gz 压缩的包目录，包含 manifest.json 和描述符文件)"
          type="info"
          showIcon
        />
        <Upload.Dragger
          name="file"
          multiple={false}
          accept=".tgz"
          beforeUpload={() => false}
          onChange={(info) => {
            if (info.fileList.length > 0) onUpload(info.fileList[0]);
          }}
          style={{ width: '100%' }}
        >
          <p className="ant-upload-drag-icon">📦</p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">支持 .tgz 格式的函数包</p>
        </Upload.Dragger>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="目标游戏">
            {localStorage.getItem('game_id') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="目标环境">
            {localStorage.getItem('env') || 'prod'}
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Modal>
  );
}
