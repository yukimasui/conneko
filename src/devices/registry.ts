import type { DeviceDefinition } from './types';

/** catalog 配下の機器定義ファイルを自動で読み込む */
const modules = import.meta.glob<{ default: DeviceDefinition }>('./catalog/**/*.ts', { eager: true });

export const deviceDefinitions: DeviceDefinition[] = Object.values(modules)
  .map((m) => m.default)
  .filter((d): d is DeviceDefinition => !!d && typeof d.type === 'string');

const byType = new Map(deviceDefinitions.map((d) => [d.type, d]));

export function getDeviceDefinition(type: string): DeviceDefinition | undefined {
  return byType.get(type);
}

/** SVG文字列の {{uid}} を機器インスタンス固有の値に置換する */
export function instantiateSvg(def: DeviceDefinition, uid: string): string {
  return def.svg.split('{{uid}}').join(uid.replace(/[^A-Za-z0-9_-]/g, '_'));
}
