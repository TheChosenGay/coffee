import './style.css';
import { RoomAPI, UserAPI } from './api';
import type { User } from './api';

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

// 初始化
renderRooms();
searchAndLoadUsers();

