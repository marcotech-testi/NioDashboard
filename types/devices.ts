export type SignalQuality = "good" | "weak" | "bad" | "noSignal";

export type ConnectionStatusCounts = {
  totalCount: number;
  onlineCount: number;
  unstableCount: number;
  offlineCount: number;
};

/** Shape projetada (fields=) do endpoint de busca — só os campos que o dashboard usa. */
export type DeviceProjection = {
  _id: string;
  vendor?: string;
  model?: string;
  installed_release?: string;
  pon_rxpower?: number;
  pon_txpower?: number;
  serial_tr069?: string;
};

/** Um WAN do dispositivo, só os campos seguros pra exibir (sem credenciais). */
export type DeviceWanDetail = {
  connectionType: string;
  status: string;
  ipv4: string | null;
};

/** Uma rede Wi-Fi do dispositivo, sem senha. */
export type DeviceWifiDetail = {
  ssid: string;
  band: string;
  channel: string;
  status: string;
};

/**
 * Retorno sanitizado de uma busca por serial — allowlist explícito de campos
 * seguros. O documento bruto da API tem senha de Wi-Fi, senha de admin,
 * senha PPPoE etc.; nada disso deve chegar ao front.
 */
export type DeviceDetail = {
  serialTr069: string;
  mac: string;
  vendor: string;
  model: string;
  installedRelease: string;
  online: boolean;
  unstableConnection: boolean;
  lastContact: string | null;
  sysUpTimeSeconds: number | null;
  ponRxPower: number | null;
  ponTxPower: number | null;
  ponTemperature: number | null;
  contractReference: string | null;
  wans: DeviceWanDetail[];
  wifi: DeviceWifiDetail[];
};

export type DeviceSearchPage = {
  success: boolean;
  message: string;
  devices: DeviceProjection[];
  page: number;
  pageLimit: number;
  totalPages: number;
};

export type NamedCount = {
  name: string;
  count: number;
};

export type EquipmentsSummary = {
  fetchedAt: string;
  counts: {
    total: number;
    online: number;
    offline: number;
    unstable: number;
  };
  signal: {
    good: number;
    weak: number;
    bad: number;
    noSignal: number;
  };
  averages: {
    rxPower: number | null;
    txPower: number | null;
  };
  distribution: {
    vendor: NamedCount[];
    model: NamedCount[];
    firmware: NamedCount[];
  };
  scannedDevices: number;
};
