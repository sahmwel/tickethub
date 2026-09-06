// frontend/src/types/html5-qrcode.d.ts
declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraIdOrConfig: string | MediaTrackConstraints,
      configuration: any,
      qrCodeSuccessCallback: (decodedText: string) => void,
      qrCodeErrorCallback?: (error: any) => void
    ): Promise<void>;
    stop(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    clear(): void;
    static getCameras(): Promise<Array<{ id: string; label: string }>>;
  }
}