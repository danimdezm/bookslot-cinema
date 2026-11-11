import type { Room } from '../../domain/types';
import { index, keys } from '../../shared/dynamo/keys';
import { getItem, putNew, queryItems } from '../../shared/dynamo/operations';

const toItem = (room: Room) => ({
  ...keys.room(room.roomId),
  type: 'ROOM',
  GSI2PK: index.rooms,
  GSI2SK: room.name,
  ...room,
});

export const findRoom = (roomId: string) => getItem<Room>(keys.room(roomId));

export const listRooms = () =>
  queryItems<Room>({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: { ':pk': index.rooms },
  });

export const saveRoom = (room: Room) => putNew(toItem(room));
