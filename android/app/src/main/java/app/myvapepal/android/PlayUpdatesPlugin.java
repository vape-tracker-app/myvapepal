package app.myvapepal.android;

import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.UpdateAvailability;

@CapacitorPlugin(name = "PlayUpdates")
public class PlayUpdatesPlugin extends Plugin {
    @PluginMethod
    public void check(PluginCall call) {
        AppUpdateManagerFactory.create(getContext()).getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                JSObject result = new JSObject();
                result.put("available", info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE);
                result.put("versionCode", info.availableVersionCode());
                call.resolve(result);
            })
            .addOnFailureListener(error -> call.reject("Google Play indisponible", error));
    }

    @PluginMethod
    public void openStore(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String id = getContext().getPackageName();
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + id));
                intent.setPackage("com.android.vending");
                getActivity().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException error) {
                try {
                    getActivity().startActivity(new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/apps/details?id=" + id)));
                    call.resolve();
                } catch (ActivityNotFoundException fallbackError) {
                    call.reject("Impossible d’ouvrir Google Play", fallbackError);
                }
            }
        });
    }
}
