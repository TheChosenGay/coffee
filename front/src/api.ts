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
}

