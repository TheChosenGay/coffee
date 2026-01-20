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
          console.log('收到WebSocket消息:', event.data);
          
          let buffer: Uint8Array;
          
          // 处理不同类型的消息数据
          if (event.data instanceof ArrayBuffer) {
            buffer = new Uint8Array(event.data);
          } else if (event.data instanceof Blob) {
            // 如果是Blob，需要先读取
            event.data.arrayBuffer().then((ab) => {
              buffer = new Uint8Array(ab);
              this.processMessage(buffer);
            });
            return;
          } else if (typeof event.data === 'string') {
            // 处理文本消息（错误消息等）
            console.log('收到文本消息:', event.data);
            if (event.data.includes('Permission Denied') || event.data.includes('User not found')) {
              if (this.onStatusChangeCallback) {
                this.onStatusChangeCallback(false);
              }
            }
            return;
          } else {
            // 尝试转换为Uint8Array
            try {
              buffer = new Uint8Array(event.data);
            } catch (e) {
              console.error('无法处理的消息类型:', typeof event.data, event.data);
              return;
            }
          }
          
          this.processMessage(buffer);
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
    try {
      const message = ChatMessage!.decode(buffer);
      const data: ChatMessageData = {
        target_id: message.target_id as number,
        is_user: message.is_user as boolean,
        contents: (message.contents as any[] || []).map((c: any) => ({
          content: c.content || []
        }))
      };
      
      if (this.onMessageCallback) {
        this.onMessageCallback(data);
      }
    } catch (error) {
      console.error('解析消息失败:', error, 'Buffer:', buffer);
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
    const chatMessage = ChatMessage.create({
      target_id: targetUserId,
      is_user: true,
      contents: [content]
    });

    // 验证消息
    const errMsg = ChatMessage.verify(chatMessage);
    if (errMsg) {
      console.error('消息验证失败:', errMsg);
      throw new Error(`消息验证失败: ${errMsg}`);
    }

    const buffer = ChatMessage.encode(chatMessage).finish();
    console.log('发送消息:', {
      userId: this.userId,
      targetUserId,
      message,
      bufferLength: buffer.length,
      buffer: Array.from(buffer)
    });
    
    try {
      this.ws.send(buffer);
      console.log('消息已发送');
    } catch (error) {
      console.error('发送消息时出错:', error);
      throw error;
    }
  }

  onMessage(callback: (data: ChatMessageData) => void): void {
    this.onMessageCallback = callback;
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
