import { getAccessToken, getTenantObservabilityIdentity } from '../lib/auth';
import { getPlatformAccessToken, getPlatformObservabilityIdentity } from '../lib/platformAuth';
import { clearRuntimeIdentity, setRuntimeIdentity } from './runtimeErrorMonitoring';

export function syncRuntimeSessionContext(): void {
  if (window.location.pathname.startsWith('/platform')) {
    const identity = getPlatformObservabilityIdentity(getPlatformAccessToken());
    if (identity) setRuntimeIdentity(identity);
    else clearRuntimeIdentity();
    return;
  }

  const identity = getTenantObservabilityIdentity(getAccessToken());
  if (identity) setRuntimeIdentity(identity);
  else clearRuntimeIdentity();
}
