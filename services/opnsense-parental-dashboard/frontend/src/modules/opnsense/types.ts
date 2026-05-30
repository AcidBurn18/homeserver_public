export type PreflightCheck = {
  ok?: boolean;
  payload?: unknown;
  error?: string;
};

export type Preflight = {
  opnsense_base_url: string;
  checks: Record<string, PreflightCheck>;
  notes: string[];
};

export type DnsblLists = {
  rows?: Array<{
    uuid: string;
    enabled: string;
    description?: string;
    url?: string;
    type?: string;
  }>;
  [k: string]: unknown;
};

export type DeviceRow = {
  id: string;
  name: string;
  mac: string;
  last_ip?: string;
};

export type OpnsenseModuleProps = {
  apiBase: string;
  checksOk: number;
  checksTotal: number;
  dnsRows: DnsblLists["rows"];
  dnsEnabled: number;
  devices: DeviceRow[];
  selectedDeviceId: string;
  setSelectedDeviceId: (value: string) => void;
  blockedRows: Array<Record<string, unknown>>;
  preflight: Preflight | null;
  warningMessage: string;
  setWarningMessage: (value: string) => void;
  allowed: string;
  setAllowed: (value: string) => void;
  blocked: string;
  setBlocked: (value: string) => void;
  siteDomain: string;
  setSiteDomain: (value: string) => void;
  dnsblExceptionUuid: string;
  setDnsblExceptionUuid: (value: string) => void;
  dnsblDomain: string;
  setDnsblDomain: (value: string) => void;
  usage: unknown;
  loadDevices: () => Promise<void>;
  loadDnsbl: () => Promise<void>;
  refreshDiscovery: () => Promise<void>;
  callControl: (path: string, enabled: boolean) => Promise<void>;
  setDeviceTimeout: (minutes: 30 | 60 | 120) => Promise<void>;
  loadWarningMessage: () => Promise<void>;
  saveWarningMessage: () => Promise<void>;
  replace: (which: "allowed" | "blocked") => Promise<void>;
  loadBlockedSites: () => Promise<void>;
  addBlockedSite: () => Promise<void>;
  removeBlockedSite: (domain: string) => Promise<void>;
  setFamilyMode: (enabled: boolean) => Promise<void>;
  toggleDnsbl: (uuid: string, enabled: boolean) => Promise<void>;
  addException: (listType: "allowlists" | "blocklists") => Promise<void>;
  loadUsage: () => Promise<void>;
  loadAllDiscoveredIps: () => Promise<void>;
  createSampleDevices: () => Promise<void>;
  setMsg: (value: string | null) => void;
};
