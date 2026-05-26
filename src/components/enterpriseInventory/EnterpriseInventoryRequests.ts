import { apiMutationRequest } from '../../lib/api';

export function postEnterpriseInventoryRequest<TResponse>(path: string, body?: unknown): Promise<TResponse> {
  return apiMutationRequest<TResponse>(path, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}



export function postEnterpriseInventoryVersionedRequest<TResponse>(
  path: string,
  version: string | number,
  body?: unknown
): Promise<TResponse> {
  return apiMutationRequest<TResponse>(path, {
    method: 'POST',
    version,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

export function patchEnterpriseInventoryRequest<TResponse>(
  path: string,
  body?: unknown,
  version?: string | number
): Promise<TResponse> {
  return apiMutationRequest<TResponse>(path, {
    method: 'PATCH',
    ...(version === undefined ? {} : { version }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

export function deleteEnterpriseInventoryRequest<TResponse>(path: string): Promise<TResponse> {
  return apiMutationRequest<TResponse>(path, { method: 'DELETE' });
}

export function deleteEnterpriseInventoryVersionedRequest<TResponse>(
  path: string,
  version: string | number
): Promise<TResponse> {
  return apiMutationRequest<TResponse>(path, {
    method: 'DELETE',
    version
  });
}
