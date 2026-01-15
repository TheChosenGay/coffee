import './style.css';
import { RoomAPI } from './api';

const api = new RoomAPI();

// DOM 元素
const roomsContainer = document.getElementById('rooms')!;
const createBtn = document.getElementById('createBtn')!;
const refreshBtn = document.getElementById('refreshBtn')!;
const maxSizeInput = document.getElementById('maxSize') as HTMLInputElement;

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
    const rooms = await api.listRooms();
    
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
    const result = await api.createRoom(maxSize);
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
    await api.deleteRoom(roomId);
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

// 事件监听
createBtn.addEventListener('click', createRoom);
refreshBtn.addEventListener('click', renderRooms);

// 回车键创建房间
maxSizeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    createRoom();
  }
});

// 初始化
renderRooms();

