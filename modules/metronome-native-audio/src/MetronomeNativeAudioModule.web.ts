import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './MetronomeNativeAudio.types';

type MetronomeNativeAudioModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class MetronomeNativeAudioModule extends NativeModule<MetronomeNativeAudioModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(MetronomeNativeAudioModule, 'MetronomeNativeAudioModule');
