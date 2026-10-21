/** ビルド時に埋め込むアプリのバージョン（vite.config.ts の define） */
declare const __APP_VERSION__: string;

/** 配布物に含まれる外部ライブラリのライセンス（build/third-party.ts） */
declare module 'virtual:third-party-licenses' {
  const licenses: { name: string; version: string; license: string; text: string }[];
  export default licenses;
}
