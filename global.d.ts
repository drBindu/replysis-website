// global.d.ts
export {};

declare global {
  interface Window {
    MediaRecorder: any;
  }
  // This handles the 'MediaRecorder' is missing error
  var MediaRecorder: {
    prototype: any;
    new (stream: MediaStream, options?: any): any;
    isTypeSupported(type: string): boolean;
  };
}

// This stops red lines from the visualizer library
declare module "react-audio-visualize";