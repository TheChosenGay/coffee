import './style.css';
import { RoomAPI, UserAPI } from './api';

const roomAPI = new RoomAPI();
const userAPI = new UserAPI();

// DOM 元素 - 在 DOMContentLoaded 中初始化
let roomsContainer: HTMLElement;
let createBtn: HTMLElement;
let refreshBtn: HTMLElement;
let maxSizeInput: HTMLInputElement;
let usersContainer: HTMLElement;
let registerBtn: HTMLElement;
let refreshUsersBtn: HTMLElement;
let nicknameInput: HTMLInputElement;
let sexSelect: HTMLSelectElement;

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
  roomsContainer.innerHTML = '<p class="loading">Loading...</p>';
  
  try {
    const rooms = await roomAPI.listRooms();
    
    if (rooms.length === 0) {
      roomsContainer.innerHTML = '<p class="empty">No rooms yet. Create one to get started!</p>';
      return;
    }
    
    roomsContainer.innerHTML = rooms.map(room => `
      <div class="room-card">
        <div class="room-info">
          <h3>Room #${room.room_id}</h3>
          <div class="room-details">
            <span class="detail">👥 Max Size: ${room.max_unit_size}</span>
            <span class="detail status" style="color: ${getStateColor(room.state)}">
              ● ${getStateName(room.state)}
            </span>
          </div>
        </div>
        <button class="delete-btn" data-room-id="${room.room_id}">Delete</button>
      </div>
    `).join('');
    
    // 添加删除按钮事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const roomId = parseInt((e.target as HTMLButtonElement).dataset.roomId!);
        deleteRoom(roomId);
      });
    });
    
  } catch (error) {
    roomsContainer.innerHTML = `
      <div class="error">
        <h3>❌ Error</h3>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p class="hint">Make sure the backend server is running on port 8080</p>
      </div>
    `;
  }
}

// 创建房间
async function createRoom() {
  console.log('createRoom function called');
  const maxSize = parseInt(maxSizeInput.value);
  console.log('maxSize:', maxSize);
  
  if (!maxSize || maxSize < 1) {
    alert('Please enter a valid size (minimum 1)');
    return;
  }
  
  createBtn.textContent = 'Creating...';
  createBtn.setAttribute('disabled', 'true');
  console.log('Calling API...');
  
  try {
    const result = await roomAPI.createRoom(maxSize);
    console.log('Room created:', result);
    
    // 显示成功消息
    showNotification(`✅ Room #${result.room_id} created successfully!`, 'success');
    
    // 重置输入
    maxSizeInput.value = '100';
    
    // 刷新列表
    await renderRooms();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    showNotification(`❌ Failed to create room: ${message}`, 'error');
  } finally {
    createBtn.textContent = 'Create Room';
    createBtn.removeAttribute('disabled');
  }
}

// 删除房间
async function deleteRoom(roomId: number) {
  if (!confirm(`Are you sure you want to delete Room #${roomId}?`)) {
    return;
  }
  
  try {
    await roomAPI.deleteRoom(roomId);
    showNotification(`✅ Room #${roomId} deleted successfully!`, 'success');
    await renderRooms();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    showNotification(`❌ Failed to delete room: ${message}`, 'error');
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
async function renderUsers() {
  usersContainer.innerHTML = '<p class="loading">Loading...</p>';
  
  try {
    const users = await userAPI.listUsers();
    
    if (users.length === 0) {
      usersContainer.innerHTML = '<p class="empty">No users yet. Register one to get started!</p>';
      return;
    }
    
    usersContainer.innerHTML = users.map(user => `
      <div class="user-card">
        <div class="user-info">
          <h3>${user.Nickname}</h3>
          <div class="user-details">
            <span class="detail">🆔 ID: ${user.UserId}</span>
            <span class="detail">${user.Sex === 0 ? '👨' : '👩'} ${user.Sex === 0 ? 'Male' : 'Female'}</span>
            ${user.Age > 0 ? `<span class="detail">🎂 Age: ${user.Age}</span>` : ''}
          </div>
        </div>
        <button class="delete-btn" data-user-id="${user.UserId}">Delete</button>
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
    
  } catch (error) {
    usersContainer.innerHTML = `
      <div class="error">
        <h3>❌ Error</h3>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p class="hint">Make sure the backend server is running on port 8080</p>
      </div>
    `;
  }
}

// 注册用户
async function registerUser() {
  const nickname = nicknameInput.value.trim();
  const sex = parseInt(sexSelect.value);
  
  if (!nickname) {
    alert('Please enter a nickname');
    return;
  }
  
  registerBtn.textContent = 'Registering...';
  registerBtn.setAttribute('disabled', 'true');
  
  try {
    const result = await userAPI.registerUser(nickname, sex);
    console.log('User registered:', result);
    
    showNotification(`✅ ${result.message}`, 'success');
    
    // 重置输入
    nicknameInput.value = '';
    sexSelect.value = '0';
    
    // 刷新列表
    await renderUsers();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    showNotification(`❌ Failed to register user: ${message}`, 'error');
  } finally {
    registerBtn.textContent = 'Register User';
    registerBtn.removeAttribute('disabled');
  }
}

// 删除用户
async function deleteUser(userId: number) {
  if (!confirm(`Are you sure you want to delete User #${userId}?`)) {
    return;
  }
  
  try {
    await userAPI.deleteUser(userId);
    showNotification(`✅ User #${userId} deleted successfully!`, 'success');
    await renderUsers();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    showNotification(`❌ Failed to delete user: ${message}`, 'error');
  }
}

// ========== Tab 切换功能 ==========

const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

function switchTab(tabName: string) {
  // 移除所有 active 类
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  // 激活选中的 tab
  const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
  const selectedContent = document.getElementById(`${tabName}-tab`);
  
  if (selectedBtn && selectedContent) {
    selectedBtn.classList.add('active');
    selectedContent.classList.add('active');
  }
}

// 绑定 tab 按钮事件
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = (btn as HTMLElement).dataset.tab;
    if (tabName) {
      switchTab(tabName);
    }
  });
});

// 初始化 - 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 初始化 DOM 元素引用
  roomsContainer = document.getElementById('rooms')!;
  createBtn = document.getElementById('createBtn')!;
  refreshBtn = document.getElementById('refreshBtn')!;
  maxSizeInput = document.getElementById('maxSize') as HTMLInputElement;
  usersContainer = document.getElementById('users')!;
  registerBtn = document.getElementById('registerBtn')!;
  refreshUsersBtn = document.getElementById('refreshUsersBtn')!;
  nicknameInput = document.getElementById('nickname') as HTMLInputElement;
  sexSelect = document.getElementById('sex') as HTMLSelectElement;
  
  // 绑定事件监听器
  createBtn.addEventListener('click', createRoom);
  refreshBtn.addEventListener('click', renderRooms);
  registerBtn.addEventListener('click', registerUser);
  refreshUsersBtn.addEventListener('click', renderUsers);
  
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
  
  // 初始化数据
  renderRooms();
  renderUsers();
});

