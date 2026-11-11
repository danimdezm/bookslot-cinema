import type { Show, ShowStatus } from '../../domain/types';
import { index, keys } from '../../shared/dynamo/keys';
import { getItem, putNew, queryItems, updateItem } from '../../shared/dynamo/operations';

const toItem = (show: Show) => ({
  ...keys.show(show.showId),
  type: 'SHOW',
  GSI2PK: index.movieShows(show.movieId),
  GSI2SK: show.startsAt,
  GSI3PK: index.allShows,
  GSI3SK: `${show.startsAt}#${show.showId}`,
  ...show,
});

export const findShow = (showId: string, consistent = false) => getItem<Show>(keys.show(showId), consistent);

export const listShowsForMovie = (movieId: string, from: string, to: string) =>
  queryItems<Show>({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :from AND :to',
    ExpressionAttributeValues: { ':pk': index.movieShows(movieId), ':from': from, ':to': to },
  });

export const listShows = (from: string, to: string) =>
  queryItems<Show>({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :pk AND GSI3SK BETWEEN :from AND :to',
    ExpressionAttributeValues: { ':pk': index.allShows, ':from': from, ':to': `${to}~` },
  });

export const saveShow = (show: Show) => putNew(toItem(show));

export const updateShowStatus = (showId: string, status: ShowStatus, actor: string, reason: string | null) =>
  updateItem<Show>({
    key: keys.show(showId),
    update: 'SET #status = :status, blockedReason = :reason, lastActor = :actor, lastReason = :reason, updatedAt = :now',
    condition: 'attribute_exists(PK)',
    names: { '#status': 'status' },
    values: { ':status': status, ':reason': reason, ':actor': actor, ':now': new Date().toISOString() },
  });

export const updateAvailable = (showId: string, available: number) =>
  updateItem<Show>({
    key: keys.show(showId),
    update: 'SET available = :n',
    condition: 'attribute_exists(PK)',
    values: { ':n': available },
  });
