import './style.css';
import { RoomAPI, UserAPI } from './api';
import type { User } from './api';
import { ChatClient } from './chat';

const roomAPI = new RoomAPI();
const userAPI = new UserAPI();

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
    
    roomsContainer.innerHTML = rooms.map(room => `
      <div class="room-card">
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
    `).join('');
    
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

// 删除房间
async function deleteRoom(roomId: number) {
  if (!confirm(`确定要删除房间 #${roomId} 吗？`)) {
    return;
  }
  
  try {
    await roomAPI.deleteRoom(roomId);
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
const messagesContainer = document.getElementById('messages')!;
const addConnectionBtn = document.getElementById('addConnectionBtn')!;
const clearMessagesBtn = document.getElementById('clearMessagesBtn')!;

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
  client.onMessage((data) => {
    const contents = data.contents || [];
    contents.forEach((content) => {
      const messages = content.content || [];
      messages.forEach((msg) => {
        addMessage('received', data.target_id, client.getUserId(), msg, connectionId);
      });
    });
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
      
      // 显示发送的消息
      addMessage('sent', info.client.getUserId(), targetUserId, message, info.id);
      
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

// 添加消息到界面
function addMessage(
  type: 'sent' | 'received', 
  fromUserId: number, 
  targetUserId: number, 
  content: string,
  connectionId: string
) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  const time = new Date().toLocaleTimeString();
  const label = type === 'sent' ? '发送' : '接收';
  const direction = type === 'sent' ? `→ 用户 ${targetUserId}` : `← 用户 ${fromUserId}`;
  const connInfo = connections.get(connectionId);
  const connLabel = connInfo ? `[连接 #${connInfo.number}]` : '';
  
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-label ${type}">${label}</span>
      <span class="message-connection">${connLabel}</span>
      <span class="message-direction">${direction}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content">${escapeHtml(content)}</div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 转义HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 清空消息
function clearMessages() {
  if (confirm('确定要清空所有消息吗？')) {
    messagesContainer.innerHTML = '';
  }
}

// Chat事件监听
addConnectionBtn.addEventListener('click', () => {
  createConnectionCard();
});

clearMessagesBtn.addEventListener('click', clearMessages);

// 初始化
renderRooms();
searchAndLoadUsers();

