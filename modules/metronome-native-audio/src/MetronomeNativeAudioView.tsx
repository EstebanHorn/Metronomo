import { requireNativeView } from 'expo';
import * as React from 'react';

import { MetronomeNativeAudioViewProps } from './MetronomeNativeAudio.types';

const NativeView: React.ComponentType<MetronomeNativeAudioViewProps> =
  requireNativeView('MetronomeNativeAudio');

export default function MetronomeNativeAudioView(props: MetronomeNativeAudioViewProps) {
  return <NativeView {...props} />;
}
