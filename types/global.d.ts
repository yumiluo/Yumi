// Web Bluetooth API 類型定義
interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(service?: string): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  isPrimary: boolean;
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(characteristic?: string): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  properties: BluetoothCharacteristicProperties;
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothCharacteristicProperties {
  read: boolean;
  write: boolean;
  writeWithoutResponse: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

interface BluetoothRequestDeviceOptions {
  filters?: BluetoothLEScanFilter[];
  optionalServices?: string[];
}

interface BluetoothLEScanFilter {
  services?: string[];
  name?: string;
  namePrefix?: string;
  manufacturerData?: BluetoothManufacturerDataFilter[];
  serviceData?: BluetoothServiceDataFilter[];
}

interface BluetoothManufacturerDataFilter {
  companyIdentifier: number;
  dataPrefix?: BufferSource;
  mask?: BufferSource;
}

interface BluetoothServiceDataFilter {
  service: string;
  dataPrefix?: BufferSource;
  mask?: BufferSource;
}

interface Navigator {
  bluetooth?: {
    getAvailability(): Promise<boolean>;
    requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
  };
}

// 擴展全局 Navigator 接口
declare global {
  interface Navigator {
    bluetooth?: {
      getAvailability(): Promise<boolean>;
      requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
    };
  }
}
