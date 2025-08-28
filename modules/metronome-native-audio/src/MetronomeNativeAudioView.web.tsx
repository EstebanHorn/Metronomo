import * as React from 'react';

import { MetronomeNativeAudioViewProps } from './MetronomeNativeAudio.types';

export default function MetronomeNativeAudioView(props: MetronomeNativeAudioViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
