import { NativeModule, requireNativeModule } from 'expo';

import { MetronomeNativeAudioModuleEvents } from './MetronomeNativeAudio.types';

declare class MetronomeNativeAudioModule extends NativeModule<MetronomeNativeAudioModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MetronomeNativeAudioModule>('MetronomeNativeAudio');
