import * as protobuf from 'protobufjs';

// 定义protobuf消息结构
const protoDefinition = `
syntax = "proto3";

message Content {
  repeated string content = 1;
}

message ChatMessage {
  int32 target_id = 1;
  bool is_user = 2;
  repeated Content contents = 3;
}
`;

let ChatMessage: protobuf.Type | null = null;
let Content: protobuf.Type | null = null;

// 初始化protobuf
async function initProtobuf() {
  if (ChatMessage && Content) {
    return;
  }
  
  const root = protobuf.parse(protoDefinition).root;
  Content = root.lookupType('Content');
  ChatMessage = root.lookupType('ChatMessage');
}

export interface ChatMessageData {
  target_id: number;
  is_user: boolean;
  contents: Array<{ content: string[] }>;
}

export class ChatClient {
  private ws: WebSocket | null = null;
  private userId: number = 0;
  private onMessageCallback: ((data: ChatMessageData) => void) | null = null;
  private onStatusChangeCallback: ((connected: boolean) => void) | null = null;

  constructor() {
    initProtobuf();
  }

  async connect(userId: number, wsUrl: string = 'ws://localhost:8081/ws'): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      throw new Error('已经连接，请先断开');
    }

    await initProtobuf();
    
    if (!ChatMessage || !Content) {
      throw new Error('Protobuf初始化失败');
    }

    this.userId = userId;
    const url = `${wsUrl}?user_id=${userId}`;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        
        // 设置二进制类型为ArrayBuffer，以便正确处理protobuf消息
        this.ws.binaryType = 'arraybuffer';
        
        this.ws.onopen = () => {
          console.log('WebSocket连接成功，用户ID:', userId);
          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(true);
          }
          resolve();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(false);
          }
          reject(new Error('WebSocket连接失败'));
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket连接关闭:', event.code, event.reason);
          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(false);
          }
        };
        
        this.ws.onmessage = (event) => {
          console.log('\n\n');
          console.log('🔌🔌🔌 ========== WebSocket onmessage 事件触发 ==========');
          console.log('🔌🔌🔌 这是最底层的消息接收！');
          console.log('🔌🔌🔌 时间:', new Date().toLocaleString('zh-CN'));
          console.log('🔌🔌🔌 当前用户ID:', this.userId);
          console.log('\n🔌 ========== WebSocket 原始消息接收 ==========');
          console.log('📦 原始事件数据:', {
            type: typeof event.data,
            constructor: event.data?.constructor?.name,
            isArrayBuffer: event.data instanceof ArrayBuffer,
            isBlob: event.data instanceof Blob,
            isString: typeof event.data === 'string',
            size: event.data instanceof ArrayBuffer ? event.data.byteLength : 
                  event.data instanceof Blob ? event.data.size : 
                  typeof event.data === 'string' ? event.data.length : 'unknown',
            完整数据: event.data
          });
          
          let buffer: Uint8Array;
          
          // 处理不同类型的消息数据
          if (event.data instanceof ArrayBuffer) {
            buffer = new Uint8Array(event.data);
            console.log(`📦 处理 ArrayBuffer 消息，大小: ${buffer.length} 字节`);
            console.log(`📦 ArrayBuffer 原始字节 (前100字节):`, Array.from(buffer.slice(0, 100)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
            console.log(`📦 ArrayBuffer 完整字节:`, Array.from(buffer).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
          } else if (event.data instanceof Blob) {
            // 如果是Blob，需要先读取
            console.log(`📦 处理 Blob 消息，大小: ${event.data.size} 字节`);
            event.data.arrayBuffer().then((ab) => {
              buffer = new Uint8Array(ab);
              console.log(`📦 Blob 转换为 ArrayBuffer，大小: ${buffer.length} 字节`);
              console.log(`📦 Blob 原始字节 (前100字节):`, Array.from(buffer.slice(0, 100)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
              this.processMessage(buffer);
            });
            return;
          } else if (typeof event.data === 'string') {
            // 处理文本消息
            console.log('📝 收到文本消息:', event.data);
            console.log('📝 文本消息完整内容:', JSON.stringify(event.data));
            
            // 检查是否是错误消息
            if (event.data.includes('Permission Denied') || event.data.includes('User not found')) {
              console.error('❌ 权限错误或用户未找到');
              if (this.onStatusChangeCallback) {
                this.onStatusChangeCallback(false);
              }
              return;
            }
            
            // 尝试将字符串转换为Uint8Array（可能是protobuf编码的字符串）
            console.log('⚠️  消息是字符串格式，尝试转换为二进制处理...');
            try {
              const str = event.data;
              
              // 方法1: 使用TextEncoder将UTF-8字符串转换为Uint8Array
              const encoder = new TextEncoder();
              const uint8Array = encoder.encode(str);
              
              console.log('✅ 字符串转换为Uint8Array成功，长度:', uint8Array.length);
              console.log('转换后的字节 (前50字节):', Array.from(uint8Array.slice(0, 50)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
              console.log('完整字节:', Array.from(uint8Array).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
              
              this.processMessage(uint8Array);
            } catch (error) {
              console.error('❌ 字符串转换失败:', error);
              console.error('错误详情:', error);
            }
            return;
          } else {
            // 尝试转换为Uint8Array
            try {
              buffer = new Uint8Array(event.data);
              console.log(`📦 转换后的消息，大小: ${buffer.length} 字节`);
              console.log(`📦 转换后的字节 (前100字节):`, Array.from(buffer.slice(0, 100)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
            } catch (e) {
              console.error('❌ 无法处理的消息类型:', typeof event.data, event.data);
              console.error('❌ 错误详情:', e);
              return;
            }
          }
          
          console.log('==========================================\n');
          console.log('🔧 准备调用 processMessage，buffer长度:', buffer.length);
          this.processMessage(buffer);
          console.log('✅ processMessage 调用完成');
        };
      } catch (error) {
        console.error('创建WebSocket连接时出错:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(false);
    }
  }

  private processMessage(buffer: Uint8Array): void {
    console.log('\n\n');
    console.log('🔍🔍🔍 ========== processMessage 被调用 ==========');
    console.log('🔍🔍🔍 这是消息解析函数！');
    console.log('🔍🔍🔍 时间:', new Date().toLocaleString('zh-CN'));
    console.log('🔍🔍🔍 当前用户ID:', this.userId);
    console.log('🔍🔍🔍 onMessageCallback 是否设置:', !!this.onMessageCallback);
    
    try {
      console.log('\n🔍 ========== 开始解析 Protobuf 消息 ==========');
      console.log('📦 原始 Buffer 数据:', {
        长度: buffer.length,
        前50字节: Array.from(buffer.slice(0, 50)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
        完整Buffer: Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' ')
      });
      
      const message = ChatMessage!.decode(buffer) as any;
      
      console.log('📋 Protobuf 解码后的原始消息对象:', JSON.stringify(message, null, 2));
      console.log('🔑 消息对象的所有键:', Object.keys(message));
      console.log('🔍 消息对象的详细信息:', {
        'message.targetId': message.targetId,
        'message.targetId类型': typeof message.targetId,
        'message.target_id': message.target_id,
        'message.target_id类型': typeof message.target_id,
        'message.isUser': message.isUser,
        'message.isUser类型': typeof message.isUser,
        'message.is_user': message.is_user,
        'message.is_user类型': typeof message.is_user,
        'message.contents': message.contents,
        'message.contents类型': typeof message.contents,
        'message.contents长度': message.contents?.length,
        完整消息对象: message
      });
      
      // protobufjs会将snake_case字段名转换为camelCase
      // 优先使用camelCase，如果没有则使用snake_case
      let targetId: number = 0;
      if (message.targetId !== undefined && message.targetId !== null) {
        targetId = Number(message.targetId);
        console.log('✅ 使用 message.targetId (camelCase):', targetId);
      } else if (message.target_id !== undefined && message.target_id !== null) {
        targetId = Number(message.target_id);
        console.log('✅ 使用 message.target_id (snake_case):', targetId);
      } else {
        console.warn('⚠️  警告：targetId 和 target_id 都不存在！');
      }
      
      let isUser: boolean = false;
      if (message.isUser !== undefined && message.isUser !== null) {
        isUser = Boolean(message.isUser);
        console.log('✅ 使用 message.isUser (camelCase):', isUser);
      } else if (message.is_user !== undefined && message.is_user !== null) {
        isUser = Boolean(message.is_user);
        console.log('✅ 使用 message.is_user (snake_case):', isUser);
      } else {
        console.warn('⚠️  警告：isUser 和 is_user 都不存在！');
      }
      
      const data: ChatMessageData = {
        target_id: targetId,
        is_user: isUser,
        contents: (message.contents || []).map((c: any) => ({
          content: c.content || []
        }))
      };
      
      console.log('✅ Protobuf 消息解析成功');
      console.log('📋 最终解析后的消息数据:', JSON.stringify(data, null, 2));
      console.log('📊 解析后的消息数据摘要:', {
        目标用户ID: data.target_id,
        目标用户ID类型: typeof data.target_id,
        是否用户消息: data.is_user,
        是否用户消息类型: typeof data.is_user,
        内容块数量: data.contents.length,
        消息总数: data.contents.reduce((sum, c) => sum + (c.content?.length || 0), 0),
        完整内容: data.contents
      });
      console.log('==========================================\n');
      
      if (this.onMessageCallback) {
        console.log('📤 调用 onMessageCallback，传递数据:', JSON.stringify(data, null, 2));
        this.onMessageCallback(data);
      } else {
        console.warn('⚠️  警告：onMessageCallback 未设置！');
      }
    } catch (error) {
      console.error('❌ Protobuf 消息解析失败:', error);
      console.error('原始 Buffer 数据:', Array.from(buffer.slice(0, 50)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      console.error('完整 Buffer 数据:', Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
  }

  async sendMessage(targetUserId: number, message: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，状态:', this.ws?.readyState);
      throw new Error('WebSocket未连接');
    }

    await initProtobuf();
    
    if (!ChatMessage || !Content) {
      throw new Error('Protobuf未初始化');
    }

    const content = Content.create({ content: [message] });
    // protobufjs在创建消息时，期望使用camelCase字段名，即使proto文件使用snake_case
    // 如果使用snake_case，字段可能会被静默丢弃
    const chatMessage = ChatMessage.create({
      targetId: targetUserId,  // camelCase
      isUser: true,            // camelCase
      contents: [content]
    });

    // 验证消息
    const errMsg = ChatMessage.verify(chatMessage);
    if (errMsg) {
      console.error('消息验证失败:', errMsg);
      throw new Error(`消息验证失败: ${errMsg}`);
    }

    // 确保is_user字段被正确编码（protobuf中false值可能被省略）
    const buffer = ChatMessage.encode(chatMessage).finish();
    
    // 验证编码后的消息（protobufjs会将snake_case转换为camelCase）
    const decoded = ChatMessage.decode(buffer) as any;
    const targetId = decoded.targetId !== undefined ? decoded.targetId : decoded.target_id;
    const isUser = decoded.isUser !== undefined ? decoded.isUser : decoded.is_user;
    
    console.log('发送消息:', {
      userId: this.userId,
      targetUserId,
      message,
      is_user: isUser,
      target_id: targetId,
      bufferLength: buffer.length,
      rawDecoded: decoded
    });
    
    // 如果is_user仍然是undefined，说明编码有问题，抛出错误
    if (isUser === undefined || isUser === false) {
      console.error('警告: is_user字段未正确编码!', {
        originalMessage: chatMessage,
        decodedMessage: decoded,
        buffer: Array.from(buffer),
        isUserValue: isUser
      });
      throw new Error('is_user字段未正确编码，请检查protobuf配置');
    }
    
    // 如果target_id不正确，也抛出错误
    if (targetId !== targetUserId) {
      console.error('警告: target_id字段未正确编码!', {
        expected: targetUserId,
        actual: targetId,
        decodedMessage: decoded
      });
      throw new Error(`target_id字段未正确编码: 期望 ${targetUserId}, 实际 ${targetId}`);
    }
    
    try {
      this.ws.send(buffer);
      console.log('消息已发送');
    } catch (error) {
      console.error('发送消息时出错:', error);
      throw error;
    }
  }

  async sendRoomMessage(roomId: number, message: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，状态:', this.ws?.readyState);
      throw new Error('WebSocket未连接');
    }

    await initProtobuf();
    
    if (!ChatMessage || !Content) {
      throw new Error('Protobuf未初始化');
    }

    const content = Content.create({ content: [message] });
    const chatMessage = ChatMessage.create({
      targetId: roomId,
      isUser: false,  // 房间消息
      contents: [content]
    });

    // 验证消息
    const errMsg = ChatMessage.verify(chatMessage);
    if (errMsg) {
      console.error('消息验证失败:', errMsg);
      throw new Error(`消息验证失败: ${errMsg}`);
    }

    const buffer = ChatMessage.encode(chatMessage).finish();
    
    console.log('发送房间消息:', {
      userId: this.userId,
      roomId,
      message,
      bufferLength: buffer.length
    });
    
    try {
      this.ws.send(buffer);
      console.log('房间消息已发送');
    } catch (error) {
      console.error('发送房间消息时出错:', error);
      throw error;
    }
  }

  onMessage(callback: (data: ChatMessageData) => void): void {
    console.log('🔧 ========== 设置 onMessage 回调 ==========');
    console.log('回调函数:', callback);
    console.log('当前用户ID:', this.userId);
    this.onMessageCallback = callback;
    console.log('✅ onMessageCallback 已设置');
    console.log('==========================================\n');
  }

  onStatusChange(callback: (connected: boolean) => void): void {
    this.onStatusChangeCallback = callback;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getUserId(): number {
    return this.userId;
  }
}
