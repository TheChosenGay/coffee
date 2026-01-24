const BASE_URL = 'http://localhost:8080';

export interface Room {
  room_id: number;
  max_unit_size: number;
  state: number;
}

export interface CreateRoomResponse {
  room_id: number;
}

export interface ErrorResponse {
  error: string;
}

export interface User {
  UserId: number;    // Go 返回的字段名是大写
  Nickname: string;
  Sex: number;
  Age: number;
  Birthday: number;
}

export interface LoginResponse {
  user_id: number;
  token: string;
}

export interface RegisterUserResponse extends LoginResponse {}

export interface RoomUnit {
  id: number;
  nickname: string;
}

export interface GetRoomUnitsResponse {
  units: RoomUnit[];
}

export interface JoinRoomResponse {
  message: string;
}

export interface QuitRoomResponse {
  message: string;
}

// Token 管理
export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function removeToken(): void {
  localStorage.removeItem('auth_token');
}

// 获取带认证头的请求配置
function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token;
  }
  return headers;
}

export class RoomAPI {
  async listRooms(): Promise<Room[]> {
    const res = await fetch(`${BASE_URL}/room/list`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }

  async createRoom(maxUnitSize: number): Promise<CreateRoomResponse> {
    const url = `${BASE_URL}/room/create?max_unit_size=${maxUnitSize}`;
    console.log('Sending request to:', url);
    
    const res = await fetch(url);
    console.log('Response status:', res.status);
    
    const data = await res.json();
    console.log('Response data:', data);
    
    if (!res.ok) {
      const error = data as ErrorResponse;
      throw new Error(error.error || 'Failed to create room');
    }
    
    return data as CreateRoomResponse;
  }

  async deleteRoom(roomId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/room/delete?room_id=${roomId}`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error((data as ErrorResponse).error || 'Failed to delete room');
    }
  }

  async joinRoom(roomId: number, userId: number): Promise<JoinRoomResponse> {
    const res = await fetch(`${BASE_URL}/room/join?room_id=${roomId}&user_id=${userId}`);
    const data = await res.json();
    if (!res.ok) {
      const error = data as ErrorResponse;
      throw new Error(error.error || 'Failed to join room');
    }
    return data as JoinRoomResponse;
  }

  async quitRoom(roomId: number, userId: number): Promise<QuitRoomResponse> {
    const res = await fetch(`${BASE_URL}/room/quit?room_id=${roomId}&user_id=${userId}`);
    const data = await res.json();
    if (!res.ok) {
      const error = data as ErrorResponse;
      throw new Error(error.error || 'Failed to quit room');
    }
    return data as QuitRoomResponse;
  }

  async getRoomUnits(roomId: number): Promise<RoomUnit[]> {
    const res = await fetch(`${BASE_URL}/room/get_units?room_id=${roomId}`);
    const data = await res.json();
    if (!res.ok) {
      const error = data as ErrorResponse;
      throw new Error(error.error || 'Failed to get room units');
    }
    const response = data as GetRoomUnitsResponse;
    return response.units || [];
  }
}

export class UserAPI {
  // 注册用户 - POST 请求，包含 password
  async registerUser(nickname: string, sex: number, password: string): Promise<RegisterUserResponse> {
    const res = await fetch(`${BASE_URL}/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nickname,
        sex,
        password,
      }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      const error = data as ErrorResponse;
      throw new Error(error.error || 'Failed to register user');
    }
    
    const response = data as LoginResponse;
    // 存储 token
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  }

  // 登录用户 - POST 请求，需要在 Authorization header 中发送 token
  // 注意：根据后端实现，登录接口需要 JWT token，所以用户必须先注册获得 token
  async loginUser(userId: number, password: string): Promise<LoginResponse> {
    // 登录接口需要 token，如果没有 token，提示用户先注册
    const token = getToken();
    if (!token) {
      throw new Error('请先注册获取 Token，然后再登录');
    }
    
    const res = await fetch(`${BASE_URL}/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({
        user_id: userId,
        password,
      }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      const error = data as ErrorResponse;
      throw new Error(error.error || 'Failed to login user');
    }
    
    const response = data as LoginResponse;
    // 存储新的 token（如果返回了新的 token）
    if (response.token) {
      setToken(response.token);
    }
    
    return response;
  }

  async listUsers(): Promise<User[]> {
    const res = await fetch(`${BASE_URL}/user/list`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }

  async deleteUser(userId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/user/delete?user_id=${userId}`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error((data as ErrorResponse).error || 'Failed to delete user');
    }
  }

  async getUserById(userId: number): Promise<User> {
    const res = await fetch(`${BASE_URL}/user/get?id=${userId}`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error((data as ErrorResponse).error || 'Failed to get user');
    }
    return res.json();
  }
}
