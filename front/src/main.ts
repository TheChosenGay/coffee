import './style.css';
import { RoomAPI, UserAPI } from './api';
import type { User, RoomUnit } from './api';
import { ChatClient } from './chat';

const roomAPI = new RoomAPI();
const userAPI = new UserAPI();

// 当前房间状态
let currentRoomId: number | null = null;
let currentUserId: number | null = null;

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
        <div class="room-actions">
          <button class="join-btn" data-room-id="${room.room_id}">加入房间</button>
          <button class="delete-btn" data-room-id="${room.room_id}">删除</button>
        </div>
      </div>
    `).join('');
    
    // 添加加入房间按钮事件
    document.querySelectorAll('.join-btn').forEach(btn => {
      const roomId = (btn as HTMLElement).dataset.roomId;
      if (roomId) {
        btn.addEventListener('click', () => {
          showJoinRoomDialog(parseInt(roomId));
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
    currentRoomId = roomId;
    currentUserId = userId;
    showNotification(`✅ 成功加入房间 #${roomId}！`, 'success');
    // 显示房间详情
    showRoomDetail(roomId);
    // 刷新房间列表
    await renderRooms();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 加入房间失败: ${message}`, 'error');
  }
}

// 退出房间
async function quitRoom(roomId: number, userId: number) {
  try {
    await roomAPI.quitRoom(roomId, userId);
    currentRoomId = null;
    currentUserId = null;
    showNotification(`✅ 成功退出房间 #${roomId}！`, 'success');
    // 隐藏房间详情
    hideRoomDetail();
    // 刷新房间列表
    await renderRooms();
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    showNotification(`❌ 退出房间失败: ${message}`, 'error');
  }
}

// 显示房间详情
async function showRoomDetail(roomId: number) {
  // 获取房间详情容器（应该在HTML中已经存在）
  let detailContainer = document.getElementById('room-detail-container');
  if (!detailContainer) {
    // 如果不存在，创建它并插入到房间列表之前
    detailContainer = document.createElement('div');
    detailContainer.id = 'room-detail-container';
    detailContainer.className = 'room-detail-container';
    // 插入到房间列表之前
    if (roomsContainer.parentElement) {
      roomsContainer.parentElement.insertBefore(detailContainer, roomsContainer);
    }
  }
  
  detailContainer.innerHTML = '<p class="loading">加载中...</p>';
  detailContainer.style.display = 'block';
  
  try {
    const units = await roomAPI.getRoomUnits(roomId);
    
    detailContainer.innerHTML = `
      <div class="room-detail-header">
        <h2>🏠 房间 #${roomId}</h2>
        ${currentUserId ? `<button class="quit-room-btn" data-room-id="${roomId}" data-user-id="${currentUserId}">退出房间</button>` : ''}
      </div>
      <div class="room-detail-content">
        <h3>👥 在线用户 (${units.length})</h3>
        <div class="room-units-list">
          ${units.length === 0 
            ? '<p class="empty">当前没有在线用户</p>' 
            : units.map(unit => `
                <div class="room-unit-card">
                  <div class="unit-info">
                    <span class="unit-avatar">👤</span>
                    <div class="unit-details">
                      <span class="unit-name">${escapeHtml(unit.nickname || `用户 ${unit.id}`)}</span>
                      <span class="unit-id">ID: ${unit.id}</span>
                    </div>
                  </div>
                </div>
              `).join('')
          }
        </div>
      </div>
    `;
    
    // 添加退出房间按钮事件
    const quitBtn = detailContainer.querySelector('.quit-room-btn');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        const roomIdAttr = (quitBtn as HTMLElement).dataset.roomId;
        const userIdAttr = (quitBtn as HTMLElement).dataset.userId;
        if (roomIdAttr && userIdAttr) {
          quitRoom(parseInt(roomIdAttr), parseInt(userIdAttr));
        }
      });
    }
    
    // 定期刷新在线用户列表
    if (currentRoomId === roomId) {
      setTimeout(() => {
        if (currentRoomId === roomId) {
          showRoomDetail(roomId);
        }
      }, 3000); // 每3秒刷新一次
    }
  } catch (error) {
    detailContainer.innerHTML = `
      <div class="error">
        <h3>❌ 错误</h3>
        <p>${error instanceof Error ? error.message : '未知错误'}</p>
      </div>
    `;
  }
}

// 隐藏房间详情
function hideRoomDetail() {
  const detailContainer = document.getElementById('room-detail-container');
  if (detailContainer) {
    detailContainer.style.display = 'none';
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
    // 如果删除的是当前房间，隐藏详情
    if (currentRoomId === roomId) {
      hideRoomDetail();
      currentRoomId = null;
      currentUserId = null;
    }
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
    
    // 接收到的消息：target_id是目标用户ID（即接收者的ID）
    // 只有当target_id等于当前连接的用户ID时，才显示这条消息
    // 确保类型一致（都转换为数字）
    const targetIdNum = Number(data.target_id) || 0;
    const currentUserIdNum = Number(currentUserId) || 0;
    
    console.log('');
    console.log('🔍 ========== ID匹配检查 ==========');
    console.log(`   接收者ID (targetIdNum): ${targetIdNum}`);
    console.log(`   接收者ID类型: ${typeof targetIdNum}`);
    console.log(`   当前用户ID (currentUserIdNum): ${currentUserIdNum}`);
    console.log(`   当前用户ID类型: ${typeof currentUserIdNum}`);
    console.log('');
    console.log('   比较结果:');
    console.log(`     targetIdNum === currentUserIdNum: ${targetIdNum === currentUserIdNum}`);
    console.log(`     targetIdNum == currentUserIdNum: ${targetIdNum == currentUserIdNum}`);
    console.log(`     targetIdNum !== currentUserIdNum: ${targetIdNum !== currentUserIdNum}`);
    console.log(`     Number(targetIdNum) === Number(currentUserIdNum): ${Number(targetIdNum) === Number(currentUserIdNum)}`);
    console.log(`     String(targetIdNum) === String(currentUserIdNum): ${String(targetIdNum) === String(currentUserIdNum)}`);
    console.log('');
    
    if (targetIdNum !== currentUserIdNum) {
      console.log('⚠️  ========== 消息被忽略 ==========');
      console.log(`   原因: 接收者ID(${targetIdNum}) 与当前用户ID(${currentUserIdNum}) 不匹配`);
      console.log(`   原始接收者ID: ${data.target_id} (类型: ${typeof data.target_id})`);
      console.log(`   原始当前用户ID: ${currentUserId} (类型: ${typeof currentUserId})`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('\n');
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

