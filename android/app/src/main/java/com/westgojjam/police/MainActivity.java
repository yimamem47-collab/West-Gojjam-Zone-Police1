package com.westgojjam.police;

import android.Manifest;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.firebase.firestore.FirebaseFirestore;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    private FirebaseFirestore db;
    private FusedLocationProviderClient fusedLocationClient;
    private static final String TAG = "MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Ensure status bar is shown and not in forced full-screen
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN);
        
        // Initialize Firebase Firestore
        db = FirebaseFirestore.getInstance();
        
        // Initialize Location Services
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        
        // Request permissions if not granted
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED ||
            ActivityCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION, 
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.CAMERA
            }, 101);
        }
    }

    /**
     * Native method to send reports to Firebase.
     * This can be called from JavaScript via a custom Capacitor plugin if needed.
     */
    public void sendReportToFirebase(String type, String data) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.getLastLocation().addOnSuccessListener(this, location -> {
                Map<String, Object> report = new HashMap<>();
                report.put("type", type);
                report.put("data", data);
                report.put("timestamp", System.currentTimeMillis());
                
                if (location != null) {
                    report.put("latitude", location.getLatitude());
                    report.put("longitude", location.getLongitude());
                }

                db.collection("WestGojjam_Reports")
                    .add(report)
                    .addOnSuccessListener(documentReference -> Log.d(TAG, "Report sent: " + documentReference.getId()))
                    .addOnFailureListener(e -> Log.w(TAG, "Error sending report", e));
            });
        } else {
            Log.w(TAG, "Location permission not granted");
        }
    }
}
