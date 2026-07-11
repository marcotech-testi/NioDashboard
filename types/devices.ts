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
