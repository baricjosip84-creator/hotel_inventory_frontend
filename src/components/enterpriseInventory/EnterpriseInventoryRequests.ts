import { apiRequest } from '../../lib/api';

export function postEnterpriseInventoryRequest<TResponse>(path: string, body?: unknown): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}



export function postEnterpriseInventoryVersionedRequest<TResponse>(
  path: string,
  version: string | number,
  body?: unknown
): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: 'POST',
    headers: {
      'If-Match-Version': String(version)
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

export function patchEnterpriseInventoryRequest<TResponse>(
  path: string,
  body?: unknown,
  version?: string | number
): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: 'PATCH',
    ...(version === undefined ? {} : { headers: { 'If-Match-Version': String(version) } }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

export function deleteEnterpriseInventoryRequest<TResponse>(path: string): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'DELETE' });
}

export function deleteEnterpriseInventoryVersionedRequest<TResponse>(
  path: string,
  version: string | number
): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: 'DELETE',
    headers: {
      'If-Match-Version': String(version)
    }
  });
}
