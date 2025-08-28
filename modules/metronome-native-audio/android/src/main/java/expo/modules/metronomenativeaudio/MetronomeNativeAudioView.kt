package expo.modules.metronomenativeaudio

import android.content.Context
import android.webkit.WebView
import android.webkit.WebViewClient
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

class MetronomeNativeAudioView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onLoad by EventDispatcher()
  internal val webView = WebView(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    webViewClient = object : WebViewClient() {
      override fun onPageFinished(view: WebView, url: String) {
        onLoad(mapOf("url" to url))
      }
    }
  }
  init { addView(webView) }
}
