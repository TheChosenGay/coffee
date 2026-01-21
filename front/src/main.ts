import './style.css';
import { RoomAPI, UserAPI } from './api';
import type { User, RoomUnit } from './api';
import { ChatClient } from './chat';

const roomAPI = new RoomAPI();
const userAPI = new UserAPI();

// 房间状态：记录每个房间加入的用户（支持多个用户）
const roomJoinedUsers = new Map<number, Set<number>>(); // roomId -> Set<userId>

// 房间消息历史：记录每个房间的聊天消息
interface RoomMessage {
  userId: number;
  nickname: string;
  message: string;
  time: Date;
}

const roomMessages = new Map<number, RoomMessage[]>(); // roomId -> messages[]

// DOM 元素 - Rooms
const roomsContainer = document.getElementById('rooms')!;
const createBtn = document.getElementById('createBtn')!;
const refreshBtn = document.getElementById('refreshBtn')!;
const maxSizeInput = document.getElementById('maxSize') as HTMLInputElement;

// DOM 元素 - Users
const usersContainer = document.getElementById('users')!;
const registerBtn = document.getElementById('registerBtn')!;
const refreshUsersBtn = document.getElementById('refreshUsersBtn')!;
const nicknameInput = document.getElementById('nickname') as HTMLInputElement;
const sexSelect = document.getElementById('sex') as HTMLSelectElement;
const userSearchInput = document.getElementById('userSearch') as HTMLInputElement;

// Tab切换
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 获取状态名称
function getStateName(state: number): string {
  const states = ['Normal', 'Banned', 'Full'];
  return states[state] || 'Unknown';
}

// 获取状态颜色
function getStateColor(state: number): string {
  const colors = ['#28a745', '#dc3545', '#ffc107'];
  return colors[state] || '#6c757d';
}

// 渲染房间列表
async function renderRooms() {
  roomsContainer.innerHTML = '<p class="loading">加载中...</p>';
  
  try {
    const rooms = await roomAPI.listRooms();
    
    if (rooms.length === 0) {
      roomsContainer.innerHTML = '<p class="empty">没有找到房间。创建一个开始吧！</p>';
      return;
    }
    
    // 获取当前已连接的用户ID列表
    const connectedUserIds = Array.from(connections.values())
      .filter(conn => conn.client.isConnected() && conn.userId > 0)
      .map(conn => conn.userId);
    
    roomsContainer.innerHTML = rooms.map(room => {
      // 获取已加入此房间的用户列表（只显示当前已连接的用户）
      const joinedUserIds = roomJoinedUsers.get(room.room_id) || new Set<number>();
      const connectedJoinedUsers = Array.from(joinedUserIds).filter(userId => connectedUserIds.includes(userId));
      const hasJoinedUsers = connectedJoinedUsers.length > 0;
      const messages = roomMessages.get(room.room_id) || [];
      
      return `
      <div class="room-card" data-room-id="${room.room_id}">
        <div class="room-header">
          <div class="room-info">
            <h3>房间 #${room.room_id}</h3>
            <div class="room-details">
              <span class="detail">👥 最大容量: ${room.max_unit_size}</span>
              <span class="detail status" style="color: ${getStateColor(room.state)}">
                ● ${getStateName(room.state)}
              </span>
            </div>
          </div>
          <button class="delete-btn" data-room-id="${room.room_id}">删除</button>
        </div>
        
        ${hasJoinedUsers ? `
        <div class="room-content">
          <div class="room-online-users">
            <h4>👥 在线用户</h4>
            <div class="room-users-list" data-room-id="${room.room_id}">加载中...</div>
          </div>
          
          <div class="room-chat">
            <div class="room-chat-header">
              <h4>💬 聊天记录</h4>
              <button class="clear-chat-btn" data-room-id="${room.room_id}">清空</button>
            </div>
            <div class="room-chat-messages" data-room-id="${room.room_id}">
              ${messages.length === 0
                ? '<p class="empty">暂无消息</p>'
                : messages.map(msg => {
                    // 判断消息是否是自己发的（检查userId是否在已连接的用户ID列表中）
                    const isSystemMessage = msg.nickname === '系统通知';
                    let messageClass: string;
                    if (isSystemMessage) {
                      messageClass = 'room-message system';
                    } else {
                      const isOwnMessage = connectedJoinedUsers.includes(msg.userId);
                      messageClass = isOwnMessage ? 'room-message own' : 'room-message other';
                    }
                    return `
                    <div class="${messageClass}">
                      <div class="message-header">
                        <span class="message-sender">${escapeHtml(msg.nickname)}</span>
                        <span class="message-sender-id">(ID: ${msg.userId})</span>
                        <span class="message-time">${msg.time.toLocaleTimeString()}</span>
                      </div>
                      <div class="message-text">${escapeHtml(msg.message)}</div>
                    </div>
                  `;
                  }).join('')
              }
            </div>
            <div class="room-chat-input">
              <input 
                type="text" 
                class="room-message-input" 
                data-room-id="${room.room_id}"
                placeholder="输入消息..."
              />
              <button class="room-send-btn" data-room-id="${room.room_id}">发送</button>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="room-footer">
          <button class="join-btn" data-room-id="${room.room_id}">加入房间</button>
        </div>
      </div>
    `;
    }).join('');
    
    // 添加加入房间按钮事件
    document.querySelectorAll('.join-btn').forEach(btn => {
      const roomId = (btn as HTMLElement).dataset.roomId;
      if (roomId) {
        btn.addEventListener('click', () => {
          showJoinRoomDialog(parseInt(roomId));
        });
      }
    });
    
    // 添加发送消息按钮事件
    // 房间ID在渲染时已经正确设置到按钮和输入框的data-room-id属性中
    // 为了确保输入框和按钮匹配，优先从按钮的同级输入框获取房间ID
    document.querySelectorAll('.room-send-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log(`📤 ========== 点击发送按钮 ==========`);
        console.log(`📤 按钮的data-room-id: ${(btn as HTMLElement).dataset.roomId}`);
        
        // 从按钮的同级输入框获取房间ID（确保输入框和按钮匹配）
        const input = btn.parentElement?.querySelector('.room-message-input') as HTMLInputElement;
        let roomId: string | undefined;
        
        if (input) {
          console.log(`📤 找到同级输入框，data-room-id: ${input.dataset.roomId}`);
          console.log(`📤 输入框的值: ${input.value}`);
          if (input.dataset.roomId) {
            roomId = input.dataset.roomId;
            console.log(`📤 ✅ 从同级输入框获取房间ID: ${roomId}`);
          }
        } else {
          console.log(`📤 ⚠️ 未找到同级输入框`);
        }
        
        if (!roomId) {
          // 如果找不到同级输入框，使用按钮的data-room-id
          roomId = (btn as HTMLElement).dataset.roomId;
          console.log(`📤 ✅ 从按钮获取房间ID: ${roomId}`);
        }
        
        if (roomId) {
          const roomIdNum = parseInt(roomId);
          console.log(`📤 最终房间ID: ${roomIdNum} (类型: ${typeof roomIdNum})`);
          sendRoomMessage(roomIdNum);
        } else {
          console.error('❌ 无法确定房间ID');
          console.error('❌ 按钮元素:', btn);
          console.error('❌ 按钮的dataset:', (btn as HTMLElement).dataset);
          showNotification('❌ 无法确定房间ID，请刷新页面', 'error');
        }
      });
    });
    
    // 添加回车发送消息
    document.querySelectorAll('.room-message-input').forEach(input => {
      input.addEventListener('keypress', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter') {
          const roomId = (e.target as HTMLElement).dataset.roomId;
          if (roomId) {
            sendRoomMessage(parseInt(roomId));
          }
        }
      });
    });
    
    // 添加清空聊天记录按钮事件
    document.querySelectorAll('.clear-chat-btn').forEach(btn => {
      const roomId = (btn as HTMLElement).dataset.roomId;
      if (roomId) {
        btn.addEventListener('click', () => {
          const roomIdNum = parseInt(roomId);
          roomMessages.set(roomIdNum, []);
          // 只更新消息显示，不刷新整个列表
          updateRoomMessagesDisplay(roomIdNum);
        });
      }
    });
    
    // 加载已加入房间的在线用户列表（每个房间只加载一次）
    const roomsToLoad = new Set<number>();
    for (const [roomId, userIds] of roomJoinedUsers.entries()) {
      const hasConnectedUsers = Array.from(userIds).some(userId => connectedUserIds.includes(userId));
      if (hasConnectedUsers) {
        roomsToLoad.add(roomId);
      }
    }
    for (const roomId of roomsToLoad) {
      loadRoomUsers(roomId);
    }
    
    // 初始化消息历史（如果还没有）
    for (const roomId of roomsToLoad) {
      if (!roomMessages.has(roomId)) {
        roomMessages.set(roomId, []);
      }
    }
    
    // 添加删除按钮事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
      const roomId = (btn as HTMLElement).dataset.roomId;
      if (roomId) {
        btn.addEventListener('click', () => {
          deleteRoom(parseInt(roomId));
        });
      }
    });
    
  } catch (error) {
    roomsContainer.innerHTML = `
      <div class="error">
        <h3>❌ 错误</h3>
        <p>${error instanceof Error ? error.message : '未知错误'}</p>
        <p class="hint">请确保后端服务器运行在端口 8080</p>
      </div>
    `;
  }
}

// 创建房间
async function createRoom() {
  const maxSize = parseInt(maxSizeInput.value);
  
  if (!maxSize || maxSize < 1) {
    alert('请输入有效的容量（最小值为 1）');
    return;
  }
  
  createBtn.textContent = '创建中...';
  createBtn.setAttribute('disabled', 'true');
  
  try {
    const result = await roomAPI.createRoom(maxSize);
    
    // 显示成功消息
    showNotification(`✅ 房间 #${result.room_id} 创建成功！`, 'success');
    
    // 重置输入
    maxSizeInput.value = '100';
    
    // 刷新列表
    await renderRooms();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 创建房间失败: ${message}`, 'error');
  } finally {
    createBtn.textContent = '创建房间';
    createBtn.removeAttribute('disabled');
  }
}

// 显示加入房间对话框
function showJoinRoomDialog(roomId: number) {
  // 获取所有已连接的WebSocket用户ID
  const connectedUserIds: number[] = [];
  connections.forEach((conn) => {
    if (conn.client.isConnected() && conn.userId > 0) {
      connectedUserIds.push(conn.userId);
    }
  });
  
  if (connectedUserIds.length === 0) {
    alert('⚠️ 请先通过WebSocket连接！\n\n请先到"聊天"标签页创建WebSocket连接，然后再加入房间。');
    return;
  }
  
  let promptMessage = '请选择要使用的用户ID：\n\n';
  promptMessage += `已连接的用户ID：${connectedUserIds.join(', ')}\n\n`;
  promptMessage += '请输入用户ID：';
  
  const userIdInput = prompt(promptMessage);
  if (!userIdInput) {
    return;
  }
  
  const userId = parseInt(userIdInput);
  if (!userId || userId < 1) {
    alert('请输入有效的用户ID（必须是大于0的数字）');
    return;
  }
  
  // 检查用户是否已连接
  if (!connectedUserIds.includes(userId)) {
    alert(`⚠️ 用户ID ${userId} 当前未通过WebSocket连接。\n\n已连接的用户ID：${connectedUserIds.join(', ')}\n\n请先连接WebSocket后再加入房间。`);
    return;
  }
  
  joinRoom(roomId, userId);
}

// 加入房间
async function joinRoom(roomId: number, userId: number) {
  console.log(`🏠 ========== 加入房间 ==========`);
  console.log(`🏠 房间ID: ${roomId} (类型: ${typeof roomId})`);
  console.log(`🏠 用户ID: ${userId} (类型: ${typeof userId})`);
  
  try {
    await roomAPI.joinRoom(roomId, userId);
    
    // 检查这是否是用户第一次加入该房间（房间的聊天区域可能还没有渲染）
    const wasEmpty = !roomJoinedUsers.has(roomId) || roomJoinedUsers.get(roomId)!.size === 0;
    
    // 添加到房间的用户集合
    if (!roomJoinedUsers.has(roomId)) {
      roomJoinedUsers.set(roomId, new Set<number>());
    }
    roomJoinedUsers.get(roomId)!.add(userId);
    
    console.log(`🏠 ✅ 用户 ${userId} 已添加到房间 #${roomId} 的用户集合`);
    console.log(`🏠 当前房间 #${roomId} 的用户:`, Array.from(roomJoinedUsers.get(roomId) || []));
    console.log(`🏠 房间之前是否为空: ${wasEmpty}`);
    
    showNotification(`✅ 用户 ${userId} 成功加入房间 #${roomId}！`, 'success');
    
    // 如果房间之前是空的（聊天区域还没有渲染），需要重新渲染整个列表
    // 否则只需要更新该房间的显示
    if (wasEmpty) {
      console.log(`🏠 房间之前为空，重新渲染整个列表以显示聊天区域`);
      await renderRooms();
    } else {
      console.log(`🏠 房间已有用户，只更新该房间的显示`);
      await updateRoomDisplay(roomId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 加入房间失败: ${message}`, 'error');
    // 如果失败，清除状态
    const userIds = roomJoinedUsers.get(roomId);
    if (userIds) {
      userIds.delete(userId);
      if (userIds.size === 0) {
        roomJoinedUsers.delete(roomId);
      }
    }
  }
}

// 退出房间
async function quitRoom(roomId: number, userId: number) {
  try {
    await roomAPI.quitRoom(roomId, userId);
    
    // 从房间的用户集合中移除
    const userIds = roomJoinedUsers.get(roomId);
    let roomIsNowEmpty = false;
    if (userIds) {
      userIds.delete(userId);
      if (userIds.size === 0) {
        roomJoinedUsers.delete(roomId);
        roomIsNowEmpty = true;
      }
    }
    
    showNotification(`✅ 用户 ${userId} 成功退出房间 #${roomId}！`, 'success');
    
    // 如果房间现在变空了（需要隐藏聊天区域），需要重新渲染整个列表
    // 否则只需要更新该房间的显示
    if (roomIsNowEmpty) {
      console.log(`🏠 房间现在为空，重新渲染整个列表以隐藏聊天区域`);
      await renderRooms();
    } else {
      console.log(`🏠 房间仍有用户，只更新该房间的显示`);
      await updateRoomDisplay(roomId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 退出房间失败: ${message}`, 'error');
  }
}

// 更新单个房间的显示（包括用户列表和消息，不重新渲染整个列表）
async function updateRoomDisplay(roomId: number) {
  // 更新用户列表
  await loadRoomUsers(roomId);
  
  // 更新消息显示
  updateRoomMessagesDisplay(roomId);
}

// 更新单个房间的消息显示（不重新渲染整个列表）
function updateRoomMessagesDisplay(roomId: number) {
  console.log(`🔄 更新房间 #${roomId} 的消息显示`);
  
  const messagesContainer = document.querySelector(`.room-chat-messages[data-room-id="${roomId}"]`) as HTMLElement;
  if (!messagesContainer) {
    console.error(`❌ 找不到房间 #${roomId} 的消息容器，可能需要重新渲染整个列表`);
    console.error(`❌ 尝试查找所有消息容器:`, document.querySelectorAll('.room-chat-messages'));
    // 如果消息容器不存在，可能需要重新渲染整个列表
    // 但这里先不自动调用renderRooms()，让调用者决定
    return;
  }
  
  const messages = roomMessages.get(roomId) || [];
  console.log(`📋 房间 #${roomId} 的消息数量: ${messages.length}`);
  
  // 获取当前已连接的用户ID列表
  const connectedUserIds = Array.from(connections.values())
    .filter(conn => conn.client.isConnected() && conn.userId > 0)
    .map(conn => conn.userId);
  
  // 获取已加入此房间的用户列表
  const joinedUserIds = roomJoinedUsers.get(roomId) || new Set<number>();
  const connectedJoinedUsers = Array.from(joinedUserIds).filter(userId => connectedUserIds.includes(userId));
  
  console.log(`👥 房间 #${roomId} 已连接的用户:`, connectedJoinedUsers);
  
  if (messages.length === 0) {
    console.log(`📋 房间 #${roomId} 没有消息，显示空状态`);
    messagesContainer.innerHTML = '<p class="empty">暂无消息</p>';
  } else {
    console.log(`📋 开始渲染 ${messages.length} 条消息`);
    const html = messages.map((msg, index) => {
      // 判断消息是否是自己发的（检查userId是否在已连接的用户ID列表中）
      const isSystemMessage = msg.nickname === '系统通知';
      let messageClass: string;
      if (isSystemMessage) {
        messageClass = 'room-message system';
      } else {
        const isOwnMessage = connectedJoinedUsers.includes(msg.userId);
        messageClass = isOwnMessage ? 'room-message own' : 'room-message other';
        console.log(` 消息 ${index + 1}: userId=${msg.userId}, isOwnMessage=${isOwnMessage}, nickname=${msg.nickname}`);
      }
      return `
      <div class="${messageClass}">
        <div class="message-header">
          <span class="message-sender">${escapeHtml(msg.nickname)}</span>
          <span class="message-sender-id">(ID: ${msg.userId})</span>
          <span class="message-time">${msg.time.toLocaleTimeString()}</span>
        </div>
        <div class="message-text">${escapeHtml(msg.message)}</div>
      </div>
    `;
    }).join('');
    
    console.log(`📋 生成的HTML长度: ${html.length}`);
    messagesContainer.innerHTML = html;
    console.log(`✅ 房间 #${roomId} 的消息显示已更新`);
  }
  
  // 滚动到底部
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 10);
}

// 加载房间在线用户列表
async function loadRoomUsers(roomId: number) {
  try {
    const units = await roomAPI.getRoomUnits(roomId);
    const usersListContainer = document.querySelector(`.room-users-list[data-room-id="${roomId}"]`) as HTMLElement;
    if (usersListContainer) {
      const joinedUserIds = roomJoinedUsers.get(roomId) || new Set<number>();
      const connectedUserIds = Array.from(connections.values())
        .filter(conn => conn.client.isConnected() && conn.userId > 0)
        .map(conn => conn.userId);
      
      usersListContainer.innerHTML = units.length === 0 
        ? '<p class="empty">当前没有在线用户</p>' 
        : units.map(unit => {
            const isJoined = joinedUserIds.has(unit.id) && connectedUserIds.includes(unit.id);
            return `
              <div class="room-user-item">
                <span class="user-avatar">👤</span>
                <span class="user-name">${escapeHtml(unit.nickname || `用户 ${unit.id}`)}</span>
                <span class="user-id">(ID: ${unit.id})</span>
                ${isJoined 
                  ? `<button class="user-quit-btn" data-room-id="${roomId}" data-user-id="${unit.id}">退出</button>`
                  : ''
                }
              </div>
            `;
          }).join('');
      
      // 添加用户退出按钮事件
      usersListContainer.querySelectorAll('.user-quit-btn').forEach(btn => {
        const roomIdAttr = (btn as HTMLElement).dataset.roomId;
        const userIdAttr = (btn as HTMLElement).dataset.userId;
        if (roomIdAttr && userIdAttr) {
          btn.addEventListener('click', () => {
            quitRoom(parseInt(roomIdAttr), parseInt(userIdAttr));
          });
        }
      });
    }
  } catch (error) {
    console.error('加载房间用户失败:', error);
    const usersListContainer = document.querySelector(`.room-users-list[data-room-id="${roomId}"]`) as HTMLElement;
    if (usersListContainer) {
      usersListContainer.innerHTML = '<div class="error">加载用户列表失败</div>';
    }
  }
}

// 发送房间消息
async function sendRoomMessage(roomId: number) {
  console.log(`📤 准备发送房间消息，房间ID: ${roomId}`);
  
  // 从对应房间的输入框获取消息内容
  // 房间ID在渲染时已经正确设置到输入框的data-room-id属性中
  const input = document.querySelector(`.room-message-input[data-room-id="${roomId}"]`) as HTMLInputElement;
  if (!input) {
    console.error(`❌ 找不到房间 #${roomId} 的输入框`);
    // 调试：显示所有输入框的信息
    const allInputs = document.querySelectorAll('.room-message-input');
    console.log(`📤 当前页面上所有输入框:`, Array.from(allInputs).map((inp: Element) => ({
      roomId: (inp as HTMLElement).dataset.roomId,
      value: (inp as HTMLInputElement).value,
      parent: (inp as HTMLElement).parentElement?.className
    })));
    return;
  }
  
  // 验证输入框的房间ID是否匹配（双重检查）
  const inputRoomId = parseInt(input.dataset.roomId || '0');
  if (inputRoomId !== roomId) {
    console.error(`❌ 房间ID不匹配: 传入房间ID=${roomId}, 输入框房间ID=${inputRoomId}`);
    console.error(`❌ 输入框元素:`, input);
    console.error(`❌ 输入框的data-room-id属性:`, input.dataset.roomId);
    showNotification(`❌ 房间ID不匹配，请刷新页面`, 'error');
    return;
  }
  
  console.log(`📤 确认房间ID: ${roomId}`);
  
  const message = input.value.trim();
  if (!message) {
    return;
  }
  
  // 找到已加入此房间且已连接的用户
  const joinedUserIds = roomJoinedUsers.get(roomId) || new Set<number>();
  const connectedUserIds = Array.from(connections.values())
    .filter(conn => conn.client.isConnected() && conn.userId > 0)
    .map(conn => conn.userId);
  
  const availableUsers = Array.from(joinedUserIds).filter(userId => connectedUserIds.includes(userId));
  
  if (availableUsers.length === 0) {
    showNotification('❌ 请先加入房间并保持WebSocket连接', 'error');
    return;
  }
  
  // 如果有多个用户，让用户选择用哪个用户ID发送
  let selectedUserId: number | undefined;
  if (availableUsers.length === 1) {
    selectedUserId = availableUsers[0];
  } else {
    const userIdInput = prompt(`请选择要使用的用户ID发送消息：\n\n已加入的用户ID：${availableUsers.join(', ')}\n\n请输入用户ID：`);
    if (!userIdInput) {
      return;
    }
    const userId = parseInt(userIdInput);
    if (!availableUsers.includes(userId)) {
      showNotification('❌ 请选择已加入房间的用户ID', 'error');
      return;
    }
    selectedUserId = userId;
  }
  
  if (!selectedUserId) {
    return;
  }
  
  // 找到对应的ChatClient
  let chatClient: ChatClient | null = null;
  for (const [connId, conn] of connections) {
    if (conn.userId === selectedUserId && conn.client.isConnected()) {
      chatClient = conn.client;
      break;
    }
  }
  
  if (!chatClient) {
    showNotification('❌ 找不到对应的WebSocket连接', 'error');
    return;
  }
  
  try {
    // 先获取用户昵称（用于立即显示）
    const units = await roomAPI.getRoomUnits(roomId);
    const unit = units.find(u => u.id === selectedUserId);
    const nickname = unit?.nickname || `用户 ${selectedUserId}`;
    
    // 立即添加到消息历史（乐观更新）
    if (!roomMessages.has(roomId)) {
      roomMessages.set(roomId, []);
    }
    const newMessage = {
      userId: selectedUserId!,
      nickname,
      message,
      time: new Date()
    };
    roomMessages.get(roomId)!.push(newMessage);
    
    console.log(`📤 消息已添加到roomMessages，房间ID: ${roomId}, 用户ID: ${selectedUserId}, 消息: ${message}`);
    console.log(`📤 当前房间消息总数: ${roomMessages.get(roomId)!.length}`);
    
    // 清空输入框
    input.value = '';
    
    // 只更新当前房间的消息显示，而不是重新渲染整个列表
    console.log(`📤 准备调用updateRoomMessagesDisplay，房间ID: ${roomId}`);
    const messagesContainer = document.querySelector(`.room-chat-messages[data-room-id="${roomId}"]`) as HTMLElement;
    if (!messagesContainer) {
      console.warn(`⚠️ 消息容器不存在，重新渲染整个列表`);
      await renderRooms();
    } else {
      updateRoomMessagesDisplay(roomId);
    }
    
    // 发送消息到服务器
    console.log(`📤 ========== 发送消息到服务器 ==========`);
    console.log(`📤 房间ID: ${roomId} (类型: ${typeof roomId})`);
    console.log(`📤 用户ID: ${selectedUserId} (类型: ${typeof selectedUserId})`);
    console.log(`📤 消息内容: ${message}`);
    console.log(`📤 输入框的data-room-id: ${input.dataset.roomId}`);
    console.log(`📤 输入框的房间ID解析: ${parseInt(input.dataset.roomId || '0')}`);
    
    // 最终验证房间ID
    const finalRoomId = parseInt(input.dataset.roomId || '0');
    if (finalRoomId !== roomId) {
      console.error(`❌ 严重错误: 房间ID不匹配！传入=${roomId}, 输入框=${finalRoomId}`);
      showNotification(`❌ 房间ID错误，请刷新页面`, 'error');
      return;
    }
    
    await chatClient.sendRoomMessage(roomId, message);
    
    console.log(`✅ 房间消息已发送: 房间 #${roomId}, 用户 ${selectedUserId}, 消息: ${message}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    console.error(`❌ 发送消息失败: ${errorMsg}`);
    showNotification(`❌ 发送消息失败: ${errorMsg}`, 'error');
    // 发送失败时，移除刚才添加的消息（如果还在的话）
    const messages = roomMessages.get(roomId);
    if (messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.userId === selectedUserId && lastMsg.message === message) {
        messages.pop();
        updateRoomMessagesDisplay(roomId);
      }
    }
  }
}

// 删除房间
async function deleteRoom(roomId: number) {
  if (!confirm(`确定要删除房间 #${roomId} 吗？`)) {
    return;
  }
  
  try {
    await roomAPI.deleteRoom(roomId);
    // 清除所有加入此房间的用户记录和消息
    roomJoinedUsers.delete(roomId);
    roomMessages.delete(roomId);
    showNotification(`✅ 房间 #${roomId} 删除成功！`, 'success');
    await renderRooms();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 删除房间失败: ${message}`, 'error');
  }
}

// 显示通知
function showNotification(message: string, type: 'success' | 'error') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ========== User Functions ==========

// 渲染用户列表
function renderUsersList(users: User[]) {
  if (users.length === 0) {
    usersContainer.innerHTML = '<p class="empty">没有找到用户。注册一个开始吧！</p>';
    return;
  }
  
  usersContainer.innerHTML = users.map(user => `
    <div class="user-card">
      <div class="user-info">
        <h3>${user.Nickname}</h3>
        <div class="user-details">
          <span class="detail">🆔 ID: ${user.UserId}</span>
          <span class="detail">${user.Sex === 0 ? '👨' : '👩'} ${user.Sex === 0 ? '男' : '女'}</span>
          ${user.Age > 0 ? `<span class="detail">🎂 年龄: ${user.Age}</span>` : ''}
        </div>
      </div>
      <button class="delete-btn" data-user-id="${user.UserId}">删除</button>
    </div>
  `).join('');
  
  // 添加删除按钮事件
  document.querySelectorAll('.delete-btn').forEach(btn => {
    const userId = (btn as HTMLElement).dataset.userId;
    if (userId) {
      btn.addEventListener('click', () => {
        deleteUser(parseInt(userId));
      });
    }
  });
}

// 搜索并加载用户
async function searchAndLoadUsers() {
  const searchTerm = userSearchInput.value.trim();
  usersContainer.innerHTML = '<p class="loading">加载中...</p>';
  
  try {
    let users: User[] = [];
    
    // 如果搜索框是纯数字，调用getUserById接口
    if (searchTerm && /^\d+$/.test(searchTerm)) {
      try {
        const user = await userAPI.getUserById(parseInt(searchTerm));
        users = [user];
      } catch (error) {
        // 如果用户不存在，返回空数组
        users = [];
      }
    } else {
      // 否则调用listUsers接口，然后在前端过滤
      const allUsers = await userAPI.listUsers();
      if (searchTerm) {
        // 过滤用户：按昵称搜索
        const term = searchTerm.toLowerCase();
        users = allUsers.filter(user => 
          user.Nickname.toLowerCase().includes(term) ||
          user.UserId.toString().includes(term)
        );
      } else {
        users = allUsers;
      }
    }
    
    renderUsersList(users);
  } catch (error) {
    usersContainer.innerHTML = `
      <div class="error">
        <h3>❌ 错误</h3>
        <p>${error instanceof Error ? error.message : '未知错误'}</p>
        <p class="hint">请确保后端服务器运行在端口 8080</p>
      </div>
    `;
  }
}

// 注册用户
async function registerUser() {
  const nickname = nicknameInput.value.trim();
  const sex = parseInt(sexSelect.value);
  
  if (!nickname) {
    alert('请输入昵称');
    return;
  }
  
  registerBtn.textContent = '注册中...';
  registerBtn.setAttribute('disabled', 'true');
  
  try {
    const result = await userAPI.registerUser(nickname, sex);
    
    showNotification(`✅ ${result.message}`, 'success');
    
    // 重置输入
    nicknameInput.value = '';
    sexSelect.value = '0';
    
    // 刷新列表
    await searchAndLoadUsers();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 注册用户失败: ${message}`, 'error');
  } finally {
    registerBtn.textContent = 'Register User';
    registerBtn.removeAttribute('disabled');
  }
}

// 删除用户
async function deleteUser(userId: number) {
  if (!confirm(`确定要删除用户 #${userId} 吗？`)) {
    return;
  }
  
  try {
    await userAPI.deleteUser(userId);
    showNotification(`✅ 用户 #${userId} 删除成功！`, 'success');
    await searchAndLoadUsers();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 删除用户失败: ${message}`, 'error');
  }
}

// ========== Tab切换功能 ==========
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    
    // 移除所有active状态
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // 添加active状态
    btn.classList.add('active');
    const targetContent = document.getElementById(`${targetTab}-tab`);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  });
});

// ========== Event Listeners ==========

// Room events
createBtn.addEventListener('click', createRoom);
refreshBtn.addEventListener('click', renderRooms);

// User events
registerBtn.addEventListener('click', registerUser);
refreshUsersBtn.addEventListener('click', searchAndLoadUsers);
// 搜索输入时调用接口
userSearchInput.addEventListener('input', () => {
  searchAndLoadUsers();
});

// 回车键快捷操作
maxSizeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    createRoom();
  }
});

nicknameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    registerUser();
  }
});

// ========== Chat Functions ==========

interface ConnectionInfo {
  id: string;
  client: ChatClient;
  userId: number;
  element: HTMLElement;
  number: number; // 连接编号
}

const connections = new Map<string, ConnectionInfo>();
let connectionIdCounter = 0;

// DOM 元素 - Chat
const connectionsContainer = document.getElementById('connections')!;
const addConnectionBtn = document.getElementById('addConnectionBtn')!;

// 创建新的连接卡片
function createConnectionCard(userId?: number): ConnectionInfo {
  const connectionId = `conn_${++connectionIdCounter}`;
  const client = new ChatClient();
  
  const card = document.createElement('div');
  card.className = 'connection-card';
  card.id = connectionId;
  
  const userIdValue = userId || 0;
  
  card.innerHTML = `
    <div class="connection-header">
      <div class="connection-info">
        <span class="connection-id">连接 #${connectionIdCounter}</span>
        <div class="connection-status">
          <span class="status-indicator disconnected"></span>
          <span class="status-text">未连接</span>
        </div>
      </div>
      <button class="remove-connection-btn" data-connection-id="${connectionId}">🗑️</button>
    </div>
    <div class="connection-body">
      <div class="connection-form">
        <input 
          type="number" 
          class="connection-user-id" 
          placeholder="用户ID" 
          min="1"
          value="${userIdValue || ''}"
          ${userIdValue ? 'disabled' : ''}
        />
        <button class="connect-btn" data-connection-id="${connectionId}">连接</button>
        <button class="disconnect-btn" data-connection-id="${connectionId}" disabled>断开</button>
      </div>
      <div class="message-form">
        <input 
          type="number" 
          class="target-user-id" 
          placeholder="目标用户ID" 
          min="1"
          disabled
        />
        <input 
          type="text" 
          class="message-input" 
          placeholder="输入消息..." 
          disabled
        />
        <button class="send-btn" data-connection-id="${connectionId}" disabled>发送</button>
      </div>
      <div class="connection-messages">
        <div class="messages-header">
          <span>📨 收到的消息</span>
          <button class="clear-connection-messages-btn" data-connection-id="${connectionId}">清空</button>
        </div>
        <div class="connection-messages-container" data-connection-id="${connectionId}"></div>
      </div>
    </div>
  `;
  
  connectionsContainer.appendChild(card);
  
  const info: ConnectionInfo = {
    id: connectionId,
    client,
    userId: userIdValue,
    element: card,
    number: connectionIdCounter
  };
  
  // 设置事件监听
  setupConnectionEvents(info);
  
  // 设置消息监听
  console.log('🔧🔧🔧 ========== 准备设置 onMessage 回调 ==========');
  console.log('🔧🔧🔧 连接ID:', info.id);
  console.log('🔧🔧🔧 用户ID:', info.userId);
  console.log('🔧🔧🔧 client对象:', client);
  
  client.onMessage(async (data) => {
    console.log('\n\n');
    console.log('📨📨📨 ========== onMessage 回调被执行！==========');
    console.log('📨📨📨 这是最顶层的消息处理回调！');
    console.log('📨📨📨 时间:', new Date().toLocaleString('zh-CN'));
    
    const currentUserId = client.getUserId();
    
    // ========== 打印所有关键信息 ==========
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📨 ========== 收到 WebSocket 消息 ==========');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏰ 接收时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('');
    console.log('👤 ========== 用户ID信息 ==========');
    console.log(`   当前连接的用户ID (currentUserId): ${currentUserId}`);
    console.log(`   用户ID类型: ${typeof currentUserId}`);
    console.log(`   用户ID值 (Number转换): ${Number(currentUserId) || 0}`);
    console.log('');
    console.log('🎯 ========== 接收者ID信息 ==========');
    console.log(`   消息中的接收者ID (data.target_id): ${data.target_id}`);
    console.log(`   接收者ID类型: ${typeof data.target_id}`);
    console.log(`   接收者ID值 (Number转换): ${Number(data.target_id) || 0}`);
    console.log('');
    console.log('📋 ========== 消息基本信息 ==========');
    console.log(`   消息类型: ${data.is_user ? '用户消息' : '系统消息'}`);
    console.log(`   is_user值: ${data.is_user}`);
    console.log(`   is_user类型: ${typeof data.is_user}`);
    
    console.log('');
    console.log('📦 ========== 完整消息对象 ==========');
    console.log('完整消息对象 (JSON):', JSON.stringify(data, null, 2));
    console.log('消息对象的所有键:', Object.keys(data));
    console.log('');
    console.log('🔍 ========== 消息对象详细信息 ==========');
    console.log({
      'data.target_id': data.target_id,
      'data.target_id类型': typeof data.target_id,
      'data.target_id值': data.target_id,
      'data.is_user': data.is_user,
      'data.is_user类型': typeof data.is_user,
      'data.contents': data.contents,
      'data.contents类型': typeof data.contents,
      'data.contents长度': data.contents?.length
    });
    
    const contents = data.contents || [];
    let messageCount = 0;
    
    // 提取并打印所有消息内容
    console.log('💬 ========== 消息内容详情 ==========');
    contents.forEach((content, contentIdx) => {
      const messages = content.content || [];
      messageCount += messages.length;
      
      console.log(`  内容块 #${contentIdx + 1}:`, {
        content对象: content,
        content键: Object.keys(content),
        messages数组: messages,
        messages长度: messages.length
      });
      
      messages.forEach((msg, msgIdx) => {
        console.log(`    消息 #${contentIdx + 1}-${msgIdx + 1}: "${msg}"`);
        console.log(`      内容类型: ${typeof msg}`);
        console.log(`      内容长度: ${msg.length} 字符`);
      });
    });
    
    console.log('');
    console.log('📊 ========== 消息统计 ==========');
    console.log(`   内容块数量: ${contents.length}`);
    console.log(`   消息总数: ${messageCount}`);
    console.log('');
    
    const targetIdNum = Number(data.target_id) || 0;
    const currentUserIdNum = Number(currentUserId) || 0;
    
    // 处理房间消息（is_user === false）
    // 对于房间消息，target_id 是房间ID，不是用户ID，所以不应该用 target_id 和 currentUserId 比较
    if (!data.is_user) {
      const roomId = targetIdNum;
      const joinedUserIds = roomJoinedUsers.get(roomId);
      
      // 对于房间消息，如果用户没有加入房间，直接返回（不需要处理）
      if (!joinedUserIds || !joinedUserIds.has(currentUserIdNum)) {
        console.log(`⚠️ 房间消息被忽略: 用户 ${currentUserIdNum} 未加入房间 #${roomId}`);
        return;
      }
      
      // 用户已加入房间，处理消息
      // 处理NOTIFY类型的消息（加入/退出通知等）
      if (data.message_type === 1) { // NOTIFY
        const notifyMsg = data.notify_message;
        if (notifyMsg) {
          const operatorId = notifyMsg.operator_id || data.sender_id || 0;
          
          if (notifyMsg.notify_type === 0) { // QUIT
            console.log(`📢 收到退出通知: 用户 ${operatorId} 退出房间 #${roomId}`);
            
            // 重新加载房间用户列表以更新在线数量
            loadRoomUsers(roomId);
            
            // 显示退出通知消息
            if (!roomMessages.has(roomId)) {
              roomMessages.set(roomId, []);
            }
            roomMessages.get(roomId)!.push({
              userId: operatorId,
              nickname: `系统通知`,
              message: `用户 ${operatorId} 已退出房间`,
              time: new Date()
            });
            
            // 只更新消息显示，不重新渲染整个页面
            updateRoomMessagesDisplay(roomId);
            
            return;
          } else if (notifyMsg.notify_type === 1) { // JOIN
            console.log(`📢 收到加入通知: 用户 ${operatorId} 加入房间 #${roomId}`);
            
            // 重新加载房间用户列表以更新在线数量
            loadRoomUsers(roomId);
            
            // 显示加入通知消息
            if (!roomMessages.has(roomId)) {
              roomMessages.set(roomId, []);
            }
            roomMessages.get(roomId)!.push({
              userId: operatorId,
              nickname: `系统通知`,
              message: `用户 ${operatorId} 已加入房间`,
              time: new Date()
            });
            
            // 只更新消息显示，不重新渲染整个页面
            updateRoomMessagesDisplay(roomId);
            
            return;
          }
        }
      }
      
      // 处理普通消息（NORMAL类型或未指定类型）
      // 提取消息内容
      const messages: string[] = [];
      contents.forEach((content) => {
        const msgs = content.content || [];
        messages.push(...msgs);
      });
      
      if (messages.length === 0) {
        return;
      }
      
      // 获取发送者信息
      const senderId = data.sender_id || 0;
      let senderNickname = '房间消息';
      
      // 尝试从房间在线用户列表中获取发送者昵称
      if (senderId > 0) {
        try {
          const units = await roomAPI.getRoomUnits(roomId);
          const unit = units.find(u => u.id === senderId);
          if (unit) {
            senderNickname = unit.nickname || `用户 ${senderId}`;
          } else {
            senderNickname = `用户 ${senderId}`;
          }
        } catch (error) {
          console.error('获取发送者信息失败:', error);
          senderNickname = `用户 ${senderId}`;
        }
      }
      
      // 检查是否是当前用户刚发送的消息（避免重复添加）
      const roomMsgs = roomMessages.get(roomId) || [];
      if (roomMsgs.length > 0) {
        const lastMsg = roomMsgs[roomMsgs.length - 1];
        if (lastMsg) {
          const timeDiff = Date.now() - lastMsg.time.getTime();
          // 如果最后一条消息时间很近（3秒内）且内容匹配，且是当前用户发送的，跳过
          if (timeDiff < 3000 && 
              lastMsg.message === messages[0] && 
              lastMsg.userId === currentUserIdNum &&
              lastMsg.userId > 0) {
            // 这是当前用户发送的消息，已经在发送时添加了，跳过
            console.log(`✅ 房间消息是当前用户发送的，已存在，跳过重复添加`);
            return;
          }
        }
      }
      
      // 添加到消息历史（避免重复添加）
      if (!roomMessages.has(roomId)) {
        roomMessages.set(roomId, []);
      }
      
      const now = Date.now();
      messages.forEach(msg => {
        // 检查是否已存在相同的消息（避免重复）
        // 检查最近5秒内是否有相同的消息
        const existing = roomMessages.get(roomId)!.find(m => 
          m.message === msg && 
          Math.abs(m.time.getTime() - now) < 5000
        );
        
        if (!existing) {
          roomMessages.get(roomId)!.push({
            userId: senderId,
            nickname: senderNickname,
            message: msg,
            time: new Date()
          });
        } else {
          console.log(`⚠️ 消息已存在，跳过重复添加: "${msg}"`);
        }
      });
      
      // 只更新消息显示，不重新渲染整个页面
      updateRoomMessagesDisplay(roomId);
      
      console.log(`✅ 房间消息已添加到房间 #${roomId}`);
      return;
    }
    
    // 处理用户消息（is_user === true）
    // 只有当target_id等于当前连接的用户ID时，才显示这条消息
    if (targetIdNum !== currentUserIdNum) {
      console.log('⚠️  ========== 消息被忽略 ==========');
      console.log(`   原因: 接收者ID(${targetIdNum}) 与当前用户ID(${currentUserIdNum}) 不匹配`);
      return;
    }
    
    console.log('✅ ========== 消息匹配成功 ==========');
    console.log(`   接收者ID (${targetIdNum}) 与当前用户ID (${currentUserIdNum}) 匹配`);
    console.log(`   开始查找并显示消息...`);
    console.log('');
    
    // 根据当前用户ID查找对应的连接卡片
    // 遍历所有连接，找到userId匹配的连接
    let targetConnectionInfo: ConnectionInfo | null = null;
    
    console.log('🔍 ========== 查找匹配的连接卡片 ==========');
    console.log(`   目标用户ID: ${currentUserIdNum}`);
    console.log(`   当前所有连接数量: ${connections.size}`);
    console.log('');
    
    console.log('   所有连接详情:');
    for (const [connId, connInfo] of connections) {
      const userIdMatch = connInfo.userId === currentUserIdNum;
      console.log(`   连接 ${connId}:`, {
        连接ID: connId,
        用户ID: connInfo.userId,
        用户ID类型: typeof connInfo.userId,
        用户ID匹配: userIdMatch,
        元素存在: !!connInfo.element,
        元素在DOM: document.body.contains(connInfo.element)
      });
      
      if (userIdMatch) {
        targetConnectionInfo = connInfo;
        console.log(`   ✅✅✅ 找到匹配的连接: ${connId} ✅✅✅`);
      }
    }
    console.log('');
    
    if (!targetConnectionInfo) {
      console.error('❌ ========== 错误：找不到匹配的连接 ==========');
      console.error(`   找不到用户ID为 ${currentUserIdNum} 的连接卡片`);
      console.error('   当前所有连接列表:');
      Array.from(connections.entries()).forEach(([id, info]) => {
        console.error(`     连接ID: ${id}, 用户ID: ${info.userId}, 用户ID类型: ${typeof info.userId}`);
      });
      console.error('═══════════════════════════════════════════════════════════');
      console.log('\n');
      return;
    }
    
    console.log('✅ ========== 使用连接信息 ==========');
    console.log({
      连接ID: targetConnectionInfo.id,
      用户ID: targetConnectionInfo.userId,
      用户ID类型: typeof targetConnectionInfo.userId,
      元素存在: !!targetConnectionInfo.element,
      元素ID: targetConnectionInfo.element?.id,
      元素在DOM: document.body.contains(targetConnectionInfo.element)
    });
    console.log('');
    
    // 这是发送给当前用户的消息，显示在接收者的卡片中
    // 直接用ID查找card元素，确保是最新的
    const cardId = targetConnectionInfo.id;
    let card = document.getElementById(cardId) as HTMLElement;
    
    if (!card) {
      console.error(`❌ 无法通过ID找到card: ${cardId}`);
      console.error('尝试使用info.element:', targetConnectionInfo.element);
      card = targetConnectionInfo.element;
    }
    
    if (!card) {
      console.error('❌ card元素不存在');
      return;
    }
    
    console.log('🔍 查找消息容器，card ID:', cardId, 'card存在:', !!card);
    
    // 通过data-connection-id属性查找容器
    let container = card.querySelector(`[data-connection-id="${cardId}"].connection-messages-container`) as HTMLElement;
    
    if (!container) {
      // 尝试直接查找类名
      container = card.querySelector('.connection-messages-container') as HTMLElement;
    }
    
    if (!container) {
      console.log('⚠️  容器不存在，尝试创建');
      const parent = card.querySelector('.connection-messages');
      if (parent) {
        container = document.createElement('div');
        container.className = 'connection-messages-container';
        container.setAttribute('data-connection-id', cardId);
        container.style.cssText = 'max-height: 300px; overflow-y: auto; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0; display: block !important;';
        parent.appendChild(container);
        console.log('✅ 创建了新容器');
      } else {
        console.error('❌ 找不到.connection-messages父元素，card HTML:', card.innerHTML.substring(0, 500));
        return;
      }
    }
    
    console.log('✅ 找到容器:', {
      container存在: !!container,
      container在DOM: document.body.contains(container),
      container子元素数: container.children.length,
      container样式: window.getComputedStyle(container).display
    });
    
    // 强制显示容器 - 使用setProperty确保优先级
    container.style.setProperty('display', 'block', 'important');
    container.style.setProperty('visibility', 'visible', 'important');
    container.style.setProperty('opacity', '1', 'important');
    container.style.setProperty('min-height', '100px', 'important');
    
    // 确保容器的父元素也可见
    const parent = container.parentElement;
    if (parent) {
      parent.style.setProperty('display', 'block', 'important');
      parent.style.setProperty('visibility', 'visible', 'important');
    }
    
    contents.forEach((content, contentIdx) => {
      const messages = content.content || [];
      messages.forEach((msg, msgIdx) => {
        console.log(`✓ 添加消息 ${contentIdx + 1}-${msgIdx + 1}: "${msg}"`);
        
        // 创建消息元素 - 使用强制内联样式确保可见
        const msgDiv = document.createElement('div');
        const time = new Date().toLocaleTimeString();
        
        // 直接设置所有样式，确保消息可见
        msgDiv.style.cssText = `
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          margin-bottom: 10px !important;
          padding: 8px 12px !important;
          background: white !important;
          border-radius: 6px !important;
          border-left: 3px solid #667eea !important;
          min-height: 50px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        `;
        
        msgDiv.className = 'message received';
        msgDiv.innerHTML = `
          <div style="font-size: 0.75rem; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="padding: 2px 8px; border-radius: 4px; background: #d1ecf1; color: #0c5460; font-weight: 600; font-size: 0.8rem;">接收</span>
            <span style="color: #999;">← 收到消息</span>
            <span style="margin-left: auto; color: #999; font-size: 0.75rem;">${time}</span>
          </div>
          <div style="font-size: 0.9rem; line-height: 1.4; color: #333; word-wrap: break-word; white-space: pre-wrap;">${escapeHtml(msg)}</div>
        `;
        
        // 添加到容器
        container.appendChild(msgDiv);
        
        // 立即强制设置样式（防止CSS覆盖）
        msgDiv.style.setProperty('display', 'block', 'important');
        msgDiv.style.setProperty('visibility', 'visible', 'important');
        msgDiv.style.setProperty('opacity', '1', 'important');
        
        // 验证添加成功
        const added = msgDiv.parentElement === container;
        const visible = msgDiv.offsetHeight > 0;
        console.log(`  ${added ? '✅' : '❌'} 消息${added ? '已' : '未'}添加到容器，${visible ? '可见' : '不可见'}，高度: ${msgDiv.offsetHeight}px`);
        
        // 如果不可见，强制修复
        if (!visible || msgDiv.offsetHeight === 0) {
          console.warn('⚠️  消息不可见，强制修复！');
          msgDiv.style.minHeight = '50px';
          msgDiv.style.height = 'auto';
          void msgDiv.offsetHeight; // 强制重排
          console.log('修复后高度:', msgDiv.offsetHeight);
        }
      });
    });
    
    // 强制确保所有消息可见
    Array.from(container.children).forEach((child, idx) => {
      const el = child as HTMLElement;
      el.style.setProperty('display', 'block', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      console.log(`  消息${idx + 1}强制显示后高度: ${el.offsetHeight}px`);
    });
    
    // 滚动到底部
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
      console.log('滚动状态:', {
        当前滚动: container.scrollTop,
        总高度: container.scrollHeight,
        容器高度: container.offsetHeight
      });
    }, 100);
    
    // 最终验证
    const finalMessageCount = container.children.length;
    const containerVisible = container.offsetHeight > 0;
    const containerDisplay = window.getComputedStyle(container).display;
    
    console.log(`\n✨ 完成！容器中共有 ${finalMessageCount} 条消息`);
    console.log('最终验证:', {
      消息数量: finalMessageCount,
      容器高度: container.offsetHeight,
      容器可见: containerVisible,
      容器显示: containerDisplay,
      第一条消息高度: finalMessageCount > 0 ? (container.children[0] as HTMLElement).offsetHeight : 0
    });
    
    // 如果消息数为0或容器不可见，显示警告
    if (finalMessageCount === 0) {
      alert('错误：消息没有添加到容器！');
    } else if (!containerVisible) {
      alert(`警告：容器中有${finalMessageCount}条消息，但容器不可见！`);
    }
  });
  
  client.onStatusChange((connected) => {
    updateConnectionStatus(info, connected);
  });
  
  connections.set(connectionId, info);
  
  return info;
}

// 设置连接事件监听
function setupConnectionEvents(info: ConnectionInfo) {
  const card = info.element;
  const userIdInput = card.querySelector('.connection-user-id') as HTMLInputElement;
  const connectBtn = card.querySelector('.connect-btn')!;
  const disconnectBtn = card.querySelector('.disconnect-btn')!;
  const targetUserIdInput = card.querySelector('.target-user-id') as HTMLInputElement;
  const messageInput = card.querySelector('.message-input') as HTMLInputElement;
  const sendBtn = card.querySelector('.send-btn')!;
  const removeBtn = card.querySelector('.remove-connection-btn')!;
  const connectionMessagesContainer = card.querySelector('.connection-messages-container') as HTMLElement;
  const clearConnectionMessagesBtn = card.querySelector('.clear-connection-messages-btn')!;
  
  connectBtn.addEventListener('click', async () => {
    const userId = parseInt(userIdInput.value);
    
    if (!userId || userId < 1) {
      alert('请输入有效的用户ID');
      return;
    }
    
    // 检查是否已经存在该用户ID的连接
    for (const [id, conn] of connections) {
      if (id !== info.id && conn.userId === userId && conn.client.isConnected()) {
        alert(`用户ID ${userId} 已经连接，请先断开该连接`);
        return;
      }
    }
    
    connectBtn.textContent = '连接中...';
    connectBtn.setAttribute('disabled', 'true');
    
    try {
      await info.client.connect(userId);
      info.userId = userId;
      
      // 手动更新状态，确保UI正确更新
      updateConnectionStatus(info, true);
      
      showNotification(`✅ WebSocket连接成功！用户ID: ${userId}`, 'success');
      
      userIdInput.disabled = true;
      targetUserIdInput.disabled = false;
      messageInput.disabled = false;
      sendBtn.disabled = false;
      disconnectBtn.disabled = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      showNotification(`❌ 连接失败: ${message}`, 'error');
      updateConnectionStatus(info, false);
    } finally {
      connectBtn.textContent = '连接';
      connectBtn.removeAttribute('disabled');
    }
  });
  
  disconnectBtn.addEventListener('click', () => {
    const userId = info.userId;
    info.client.disconnect();
    showNotification(`已断开连接 (用户ID: ${userId})`, 'success');
    
    // 清除该用户的房间加入状态
    if (userId > 0) {
      // 从所有房间中移除该用户，并更新受影响的房间
      const affectedRooms = new Set<number>();
      for (const [roomId, userIds] of roomJoinedUsers.entries()) {
        if (userIds.has(userId)) {
          userIds.delete(userId);
          affectedRooms.add(roomId);
          if (userIds.size === 0) {
            roomJoinedUsers.delete(roomId);
          }
        }
      }
      // 只更新受影响的房间，不刷新整个列表
      affectedRooms.forEach(roomId => {
        updateRoomDisplay(roomId);
      });
    }
    
    userIdInput.disabled = false;
    targetUserIdInput.disabled = false;
    messageInput.disabled = false;
    sendBtn.disabled = true;
    disconnectBtn.disabled = true;
    
    updateConnectionStatus(info, false);
  });
  
  sendBtn.addEventListener('click', async () => {
    const targetUserId = parseInt(targetUserIdInput.value);
    const message = messageInput.value.trim();
    
    if (!targetUserId || targetUserId < 1) {
      alert('请输入有效的目标用户ID');
      return;
    }
    
    if (!message) {
      alert('请输入消息内容');
      return;
    }
    
    try {
      await info.client.sendMessage(targetUserId, message);
      
      // 不显示发送的消息在发送者的卡片中
      // 消息会显示在接收者的卡片中（当接收者收到消息时）
      
      // 清空输入框
      messageInput.value = '';
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      showNotification(`❌ 发送失败: ${message}`, 'error');
    }
  });
  
  // 回车发送消息
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !sendBtn.hasAttribute('disabled')) {
      sendBtn.click();
    }
  });
  
  targetUserIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !sendBtn.hasAttribute('disabled')) {
      messageInput.focus();
    }
  });
  
  removeBtn.addEventListener('click', () => {
    removeConnection(info.id);
  });
  
  clearConnectionMessagesBtn.addEventListener('click', () => {
    if (confirm('确定要清空此连接的消息吗？')) {
      connectionMessagesContainer.innerHTML = '';
    }
  });
}

// 更新连接状态
function updateConnectionStatus(info: ConnectionInfo, connected: boolean) {
  const card = info.element;
  const indicator = card.querySelector('.status-indicator')!;
  const statusText = card.querySelector('.status-text')!;
  
  if (connected) {
    indicator.className = 'status-indicator connected';
    statusText.textContent = `已连接 (用户ID: ${info.userId})`;
  } else {
    indicator.className = 'status-indicator disconnected';
    statusText.textContent = '未连接';
    
    // 断开连接时，清除该用户的房间加入状态
    if (info.userId > 0) {
      // 从所有房间中移除该用户，并更新受影响的房间
      const affectedRooms = new Set<number>();
      for (const [roomId, userIds] of roomJoinedUsers.entries()) {
        if (userIds.has(info.userId)) {
          userIds.delete(info.userId);
          affectedRooms.add(roomId);
          if (userIds.size === 0) {
            roomJoinedUsers.delete(roomId);
          }
        }
      }
      // 只更新受影响的房间，不刷新整个列表
      affectedRooms.forEach(roomId => {
        updateRoomDisplay(roomId);
      });
    }
  }
}

// 移除连接
function removeConnection(connectionId: string) {
  const info = connections.get(connectionId);
  if (!info) return;
  
  const userId = info.userId;
  
  if (info.client.isConnected()) {
    if (!confirm(`确定要移除连接 #${info.number} 吗？连接将被断开。`)) {
      return;
    }
    info.client.disconnect();
  }
  
  // 清除该用户的房间加入状态
  if (userId > 0) {
    // 从所有房间中移除该用户，并更新受影响的房间
    const affectedRooms = new Set<number>();
    for (const [roomId, userIds] of roomJoinedUsers.entries()) {
      if (userIds.has(userId)) {
        userIds.delete(userId);
        affectedRooms.add(roomId);
        if (userIds.size === 0) {
          roomJoinedUsers.delete(roomId);
        }
      }
    }
    // 只更新受影响的房间，不刷新整个列表
    affectedRooms.forEach(roomId => {
      updateRoomDisplay(roomId);
    });
  }
  
  info.element.remove();
  connections.delete(connectionId);
  showNotification('连接已移除', 'success');
}

// 添加消息到连接卡片（保留用于发送消息）
function addConnectionMessage(
  info: ConnectionInfo,
  type: 'sent' | 'received',
  fromUserId: number,
  content: string,
  targetUserId?: number
) {
  // 这个函数现在主要用于发送消息
  // 接收消息直接在onMessage回调中处理
  const card = info.element;
  if (!card || !document.body.contains(card)) {
    console.error('❌ card不存在或不在DOM中');
    return;
  }
  
  let container = card.querySelector('.connection-messages-container') as HTMLElement;
  if (!container) {
    const parent = card.querySelector('.connection-messages');
    if (parent) {
      container = document.createElement('div');
      container.className = 'connection-messages-container';
      parent.appendChild(container);
    } else {
      console.error('❌ 找不到消息容器');
      return;
    }
  }
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${type}`;
  const time = new Date().toLocaleTimeString();
  const label = type === 'sent' ? '发送' : '接收';
  const direction = type === 'sent' 
    ? `→ 用户 ${targetUserId || '?'}` 
    : (fromUserId > 0 ? `← 用户 ${fromUserId}` : '← 收到消息');
  
  msgDiv.innerHTML = `
    <div class="message-header">
      <span class="message-label ${type}">${label}</span>
      <span class="message-direction">${direction}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content">${escapeHtml(content)}</div>
  `;
  
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

// 转义HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Chat事件监听
addConnectionBtn.addEventListener('click', () => {
  createConnectionCard();
});

// 初始化
renderRooms();
searchAndLoadUsers();

