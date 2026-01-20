import './style.css';
import { RoomAPI, UserAPI } from './api';
import type { User, RoomUnit } from './api';
import { ChatClient } from './chat';

const roomAPI = new RoomAPI();
const userAPI = new UserAPI();

// 房间状态管理
interface RoomState {
  roomId: number;
  userId: number | null; // 当前用户是否在此房间
  units: RoomUnit[];
  messages: Array<{
    userId: number;
    nickname: string;
    message: string;
    time: Date;
  }>;
  chatClient: ChatClient | null; // 用于发送消息的客户端
}

const roomStates = new Map<number, RoomState>();

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
    
    // 为每个房间创建卡片
    roomsContainer.innerHTML = rooms.map(room => {
      const state = roomStates.get(room.room_id) || {
        roomId: room.room_id,
        userId: null,
        units: [],
        messages: [],
        chatClient: null
      };
      roomStates.set(room.room_id, state);
      
      const isJoined = state.userId !== null;
      
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
          <div class="room-actions">
            ${isJoined 
              ? `<button class="quit-room-btn" data-room-id="${room.room_id}">退出房间</button>`
              : `<button class="join-btn" data-room-id="${room.room_id}">加入房间</button>`
            }
            <button class="delete-btn" data-room-id="${room.room_id}">删除</button>
          </div>
        </div>
        
        ${isJoined ? `
        <div class="room-content">
          <div class="room-online-users">
            <h4>👥 在线用户 (${state.units.length})</h4>
            <div class="room-units-list">
              ${state.units.length === 0 
                ? '<p class="empty">当前没有在线用户</p>' 
                : state.units.map(unit => `
                    <div class="room-unit-item">
                      <span class="unit-avatar">👤</span>
                      <span class="unit-name">${escapeHtml(unit.nickname || `用户 ${unit.id}`)}</span>
                      <span class="unit-id">(ID: ${unit.id})</span>
                    </div>
                  `).join('')
              }
            </div>
          </div>
          
          <div class="room-chat">
            <div class="room-chat-header">
              <h4>💬 聊天记录</h4>
              <button class="clear-chat-btn" data-room-id="${room.room_id}">清空</button>
            </div>
            <div class="room-chat-messages" data-room-id="${room.room_id}">
              ${state.messages.length === 0
                ? '<p class="empty">暂无消息</p>'
                : state.messages.map(msg => `
                    <div class="room-message">
                      <span class="message-sender">${escapeHtml(msg.nickname)}</span>
                      <span class="message-time">${msg.time.toLocaleTimeString()}</span>
                      <div class="message-text">${escapeHtml(msg.message)}</div>
                    </div>
                  `).join('')
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
    
    // 添加退出房间按钮事件
    document.querySelectorAll('.quit-room-btn').forEach(btn => {
      const roomId = (btn as HTMLElement).dataset.roomId;
      if (roomId) {
        btn.addEventListener('click', () => {
          const state = roomStates.get(parseInt(roomId));
          if (state && state.userId) {
            quitRoom(parseInt(roomId), state.userId);
          }
        });
      }
    });
    
    // 添加发送消息按钮事件
    document.querySelectorAll('.room-send-btn').forEach(btn => {
      const roomId = (btn as HTMLElement).dataset.roomId;
      if (roomId) {
        btn.addEventListener('click', () => {
          sendRoomMessage(parseInt(roomId));
        });
      }
    });
    
    // 添加回车发送消息
    document.querySelectorAll('.room-message-input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
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
          const state = roomStates.get(parseInt(roomId));
          if (state) {
            state.messages = [];
            renderRooms();
          }
        });
      }
    });
    
    // 添加删除按钮事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
      const roomId = (btn as HTMLElement).dataset.roomId;
      if (roomId) {
        btn.addEventListener('click', () => {
          deleteRoom(parseInt(roomId));
        });
      }
    });
    
    // 注意：不在这里刷新在线用户列表，避免循环调用
    // 在线用户列表会在加入房间时刷新，或通过其他事件触发刷新
    
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
  
  let promptMessage = '请输入您的用户ID：\n\n';
  if (connectedUserIds.length > 0) {
    promptMessage += `💡 提示：您当前已连接的WebSocket用户ID：${connectedUserIds.join(', ')}\n`;
    promptMessage += '（请使用已连接的用户ID加入房间）\n\n';
  } else {
    promptMessage += '⚠️ 警告：您还没有通过WebSocket连接！\n';
    promptMessage += '请先到"聊天"标签页创建WebSocket连接，然后再加入房间。\n\n';
  }
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
  if (connectedUserIds.length > 0 && !connectedUserIds.includes(userId)) {
    const confirmJoin = confirm(
      `⚠️ 用户ID ${userId} 当前未通过WebSocket连接。\n\n` +
      `已连接的用户ID：${connectedUserIds.join(', ')}\n\n` +
      `是否仍要继续加入房间？\n` +
      `（注意：只有在线用户才能加入房间）`
    );
    if (!confirmJoin) {
      return;
    }
  }
  
  joinRoom(roomId, userId);
}

// 加入房间
async function joinRoom(roomId: number, userId: number) {
  try {
    await roomAPI.joinRoom(roomId, userId);
    
    // 获取或创建房间状态
    let state = roomStates.get(roomId);
    if (!state) {
      state = {
        roomId,
        userId: null,
        units: [],
        messages: [],
        chatClient: null
      };
      roomStates.set(roomId, state);
    }
    
    // 查找对应的WebSocket连接
    let chatClient: ChatClient | null = null;
    for (const [connId, conn] of connections) {
      if (conn.userId === userId && conn.client.isConnected()) {
        chatClient = conn.client;
        break;
      }
    }
    
    if (!chatClient) {
      throw new Error('请先通过WebSocket连接（在"聊天"标签页创建连接）');
    }
    
    // 设置房间状态
    state.userId = userId;
    state.chatClient = chatClient;
    
    // 刷新在线用户列表（不更新UI，因为后面会调用renderRooms）
    await refreshRoomUnits(roomId, false);
    
    // 设置房间消息监听（如果还没有设置）
    setupRoomMessageListener(roomId, userId, chatClient);
    
    showNotification(`✅ 成功加入房间 #${roomId}！`, 'success');
    // 刷新房间列表以显示新UI
    await renderRooms();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 加入房间失败: ${message}`, 'error');
  }
}

// 刷新房间在线用户列表
async function refreshRoomUnits(roomId: number, updateUI: boolean = true) {
  try {
    const units = await roomAPI.getRoomUnits(roomId);
    const state = roomStates.get(roomId);
    if (state) {
      state.units = units;
      // 如果房间已加入且需要更新UI，只更新该房间的UI
      if (state.userId !== null && updateUI) {
        updateRoomCardUI(roomId);
      }
    }
  } catch (error) {
    console.error('刷新房间在线用户失败:', error);
  }
}

// 只更新特定房间卡片的UI，而不是重新渲染整个列表
function updateRoomCardUI(roomId: number) {
  const state = roomStates.get(roomId);
  if (!state || state.userId === null) {
    return;
  }
  
  const roomCard = document.querySelector(`.room-card[data-room-id="${roomId}"]`) as HTMLElement;
  if (!roomCard) {
    return;
  }
  
  // 更新在线用户列表
  const unitsList = roomCard.querySelector('.room-units-list');
  if (unitsList) {
    unitsList.innerHTML = state.units.length === 0 
      ? '<p class="empty">当前没有在线用户</p>' 
      : state.units.map(unit => `
          <div class="room-unit-item">
            <span class="unit-avatar">👤</span>
            <span class="unit-name">${escapeHtml(unit.nickname || `用户 ${unit.id}`)}</span>
            <span class="unit-id">(ID: ${unit.id})</span>
          </div>
        `).join('');
  }
  
  // 更新在线用户数量
  const unitsHeader = roomCard.querySelector('.room-online-users h4');
  if (unitsHeader) {
    unitsHeader.textContent = `👥 在线用户 (${state.units.length})`;
  }
  
  // 更新聊天记录
  const messagesContainer = roomCard.querySelector('.room-chat-messages') as HTMLElement;
  if (messagesContainer) {
    messagesContainer.innerHTML = state.messages.length === 0
      ? '<p class="empty">暂无消息</p>'
      : state.messages.map(msg => `
          <div class="room-message">
            <span class="message-sender">${escapeHtml(msg.nickname)}</span>
            <span class="message-time">${msg.time.toLocaleTimeString()}</span>
            <div class="message-text">${escapeHtml(msg.message)}</div>
          </div>
        `).join('');
    
    // 滚动到底部
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 10);
  }
}

// 设置房间消息监听
function setupRoomMessageListener(roomId: number, userId: number, chatClient: ChatClient) {
  // 检查是否已经设置过监听器
  const state = roomStates.get(roomId);
  if (state && (state as any).listenerSetup) {
    return; // 已经设置过，避免重复设置
  }
  
  // 标记已设置监听器
  if (state) {
    (state as any).listenerSetup = true;
  }
  
  // 监听消息（在现有的onMessage回调中处理）
  // 注意：这里我们需要确保房间消息能被正确处理
  // 由于ChatClient的onMessage是全局的，我们需要在全局消息处理中识别房间消息
}

// 发送房间消息
async function sendRoomMessage(roomId: number) {
  const state = roomStates.get(roomId);
  if (!state || !state.userId || !state.chatClient) {
    showNotification('❌ 请先加入房间', 'error');
    return;
  }
  
  const input = document.querySelector(`.room-message-input[data-room-id="${roomId}"]`) as HTMLInputElement;
  if (!input) {
    return;
  }
  
  const message = input.value.trim();
  if (!message) {
    return;
  }
  
  try {
    await state.chatClient.sendRoomMessage(roomId, message);
    
    // 获取用户昵称
    const unit = state.units.find(u => u.id === state.userId);
    const nickname = unit?.nickname || `用户 ${state.userId}`;
    
    // 添加到消息列表
    state.messages.push({
      userId: state.userId!,
      nickname,
      message,
      time: new Date()
    });
    
    // 清空输入框
    input.value = '';
    
    // 只更新该房间的UI，而不是重新渲染整个列表
    updateRoomCardUI(roomId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 发送消息失败: ${message}`, 'error');
  }
}

// 退出房间
async function quitRoom(roomId: number, userId: number) {
  try {
    await roomAPI.quitRoom(roomId, userId);
    
    // 清理房间状态
    const state = roomStates.get(roomId);
    if (state) {
      state.userId = null;
      state.chatClient = null;
      // 保留消息和在线用户列表，以便重新加入时可以看到
    }
    
    showNotification(`✅ 成功退出房间 #${roomId}！`, 'success');
    // 刷新房间列表
    await renderRooms();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 退出房间失败: ${message}`, 'error');
  }
}

// 删除房间
async function deleteRoom(roomId: number) {
  if (!confirm(`确定要删除房间 #${roomId} 吗？`)) {
    return;
  }
  
  try {
    await roomAPI.deleteRoom(roomId);
    // 清理房间状态
    roomStates.delete(roomId);
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
  
  client.onMessage((data) => {
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
    if (!data.is_user) {
      const roomId = targetIdNum;
      const state = roomStates.get(roomId);
      
      if (state && state.userId !== null) {
        // 提取消息内容
        const messages: string[] = [];
        contents.forEach((content) => {
          const msgs = content.content || [];
          messages.push(...msgs);
        });
        
        // 注意：当前协议中没有sender_id字段
        // 由于房间消息是广播的，我们无法直接知道发送者
        // 但我们可以检查是否是当前用户发送的（通过检查最近发送的消息）
        // 如果不是，则标记为"房间消息"
        let senderId = 0;
        let senderNickname = '房间消息';
        
        // 检查是否是当前用户刚发送的消息（通过比较最后一条消息）
        if (state.messages.length > 0) {
          const lastMsg = state.messages[state.messages.length - 1];
          if (lastMsg) {
            // 如果最后一条消息的时间很近（1秒内）且内容匹配，可能是当前用户发送的
            const timeDiff = Date.now() - lastMsg.time.getTime();
            if (timeDiff < 1000 && messages.length > 0 && lastMsg.message === messages[0]) {
              senderId = state.userId;
              const unit = state.units.find(u => u.id === state.userId);
              senderNickname = unit?.nickname || `用户 ${state.userId}`;
            }
          }
        }
        
        // 添加消息到房间状态（避免重复添加自己发送的消息）
        messages.forEach((msg, index) => {
          // 如果是第一条消息且可能是自己发送的，跳过（因为已经在sendRoomMessage中添加了）
          if (index === 0 && senderId === state.userId && state.messages.length > 0) {
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg && lastMsg.message === msg && lastMsg.userId === senderId) {
              return; // 跳过重复消息
            }
          }
          
          state.messages.push({
            userId: senderId,
            nickname: senderNickname,
            message: msg,
            time: new Date()
          });
        });
        
        // 只更新该房间的UI，而不是重新渲染整个列表
        updateRoomCardUI(roomId);
        
        console.log(`✅ 房间消息已添加到房间 #${roomId}`);
        return;
      }
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
    info.client.disconnect();
    showNotification(`已断开连接 (用户ID: ${info.userId})`, 'success');
    
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
  }
}

// 移除连接
function removeConnection(connectionId: string) {
  const info = connections.get(connectionId);
  if (!info) return;
  
  if (info.client.isConnected()) {
    if (!confirm(`确定要移除连接 #${info.number} 吗？连接将被断开。`)) {
      return;
    }
    info.client.disconnect();
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

