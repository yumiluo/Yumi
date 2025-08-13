// 系統架構核心模組
export interface SystemArchitecture {
  frontend: FrontendLayer
  backend: BackendLayer
  communication: CommunicationLayer
  deviceManagement: DeviceManagementModule
  contentDelivery: ContentDeliveryNetwork
}

// 前端層架構
export interface FrontendLayer {
  adminConsole: any // AdminConsoleModule
  userViewer: any // UserViewerModule
  sharedComponents: any // SharedComponentsModule
}

// 後端層架構
export interface BackendLayer {
  apiGateway: any // APIGatewayModule
  deviceService: any // DeviceServiceModule
  contentService: any // ContentServiceModule
  syncService: any // SyncServiceModule
  analyticsService: any // AnalyticsServiceModule
}

// 即時通信層
export interface CommunicationLayer {
  websocketServer: any // WebSocketServerModule
  messageQueue: any // MessageQueueModule
  heartbeatSystem: any // HeartbeatSystemModule
  syncProtocol: any // SyncProtocolModule
}

// 設備管理模組
export interface DeviceManagementModule {
  deviceRegistry: any // DeviceRegistryService
  connectionDiagnostics: any // ConnectionDiagnosticsService
  deviceGrouping: any // DeviceGroupingService
  loadBalancer: any // LoadBalancerService
}

// 內容分發網路
export interface ContentDeliveryNetwork {
  youtubeIntegration: any // YouTubeIntegrationService
  localContentManager: any // LocalContentManagerService
  streamingOptimizer: any // StreamingOptimizerService
  cacheManager: any // CacheManagerService
}

// 系統配置
export const SYSTEM_CONFIG = {
  // 同步精度要求
  SYNC_TOLERANCE_MS: 200, // ±200ms內
  SYNC_ACCURACY_REQUIREMENT: 0.5, // <0.5%不同步率

  // 設備連接限制
  MAX_CONCURRENT_DEVICES: 50,
  HEARTBEAT_INTERVAL_MS: 1000,
  CONNECTION_TIMEOUT_MS: 30000,

  // 影片品質設定
  SUPPORTED_RESOLUTIONS: ["1080p", "1440p", "4K", "8K"],
  VR_MODES: ["mono", "stereo", "360", "180"],

  // 網路適應性
  NETWORK_ADAPTATION: {
    EXCELLENT: { bitrate: "4K", latency: 50 },
    GOOD: { bitrate: "1440p", latency: 100 },
    FAIR: { bitrate: "1080p", latency: 200 },
    POOR: { bitrate: "720p", latency: 500 },
  },
} as const
