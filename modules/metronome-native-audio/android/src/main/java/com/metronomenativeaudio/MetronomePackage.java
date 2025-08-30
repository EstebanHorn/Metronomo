package com.metronomenativeaudio;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class MetronomePackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext rc) {
    return Arrays.asList(new MetronomeModule(rc));
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext rc) {
    return Collections.emptyList();
  }
}
