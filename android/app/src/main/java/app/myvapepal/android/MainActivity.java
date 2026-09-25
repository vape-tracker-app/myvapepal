package app.myvapepal.android;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayUpdatesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
