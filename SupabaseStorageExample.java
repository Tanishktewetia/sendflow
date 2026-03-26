import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Supabase Storage REST API Example
 * Minimal, clean, production-ready
 * 
 * Upload: PUT /storage/v1/object/avatar_img/{userId}.jpg
 * Delete: DELETE /storage/v1/object with JSON body
 * Overwrite: Enabled by default on PUT requests
 */
public class SupabaseStorageExample {
    
    // Configuration
    private static final String SUPABASE_URL = "https://gksgsxkusmorkbtkjemh.supabase.co";
    private static final String STORAGE_API = "/storage/v1";
    private static final String BUCKET = "avatar_img";
    private static final String API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrsgHNkdWpIeywiYWxsb3dlZEZvcklkIjpudWxsLCJjYW4iOnsiMiIsImFjdGlvuXsiY2xvdWRzdG9yYWdlIjp7Il91c2VyX2lkIn19LCJzdWIiOiJ2Yd1lZDVmZWlhcmM3L3Q4YmkzNWlucmxhaTkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3NTUyMDk0MTIsImVtYWlsIjoiIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJhbm9uIn0sInVzZXJfbWV0YWRhdGEiOnt9fQ.6lquwVQQmGPWKKkZhGZYbKjmj2sOMNYe83W66JdP5f4";
    
    private final HttpClient httpClient;
    
    public SupabaseStorageExample() {
        this.httpClient = HttpClient.newHttpClient();
    }
    
    /**
     * Upload profile image to Supabase Storage
     * Overwrites existing file if path is the same
     */
    public void uploadProfileImage(Long userId, String localFilePath) throws Exception {
        // Read file as byte[]
        byte[] fileBytes = Files.readAllBytes(Paths.get(localFilePath));
        String fileName = userId + ".jpg";
        
        // Build URL: PUT /storage/v1/object/avatar_img/{userId}.jpg
        String url = SUPABASE_URL + STORAGE_API + "/object/" + BUCKET + "/" + fileName;
        
        // Create PUT request
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .PUT(HttpRequest.BodyPublishers.ofByteArray(fileBytes))
                .header("Authorization", "Bearer " + API_KEY)
                .header("Content-Type", "image/jpeg")
                .build();
        
        // Send request
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        System.out.println("=== UPLOAD RESPONSE ===");
        System.out.println("Status: " + response.statusCode());
        System.out.println("Body: " + response.body());
        System.out.println("File: " + fileName + " (" + fileBytes.length + " bytes)");
    }
    
    /**
     * Delete profile image from Supabase Storage
     * Uses prefixes array in JSON body
     */
    public void deleteProfileImage(Long userId) throws Exception {
        String fileName = userId + ".jpg";
        
        // Build URL: DELETE /storage/v1/object
        String url = SUPABASE_URL + STORAGE_API + "/object";
        
        // JSON body: {"prefixes": ["avatar_img/{userId}.jpg"]}
        String jsonBody = "{\"prefixes\": [\"" + BUCKET + "/" + fileName + "\"]}";
        
        // Create DELETE request with JSON body
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .method("DELETE", HttpRequest.BodyPublishers.ofString(jsonBody))
                .header("Authorization", "Bearer " + API_KEY)
                .header("Content-Type", "application/json")
                .build();
        
        // Send request
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        System.out.println("=== DELETE RESPONSE ===");
        System.out.println("Status: " + response.statusCode());
        System.out.println("Body: " + response.body());
        System.out.println("File: " + fileName);
    }
    
    /**
     * Get public URL for an image
     */
    public String getPublicUrl(Long userId) {
        String fileName = userId + ".jpg";
        return SUPABASE_URL + STORAGE_API + "/object/public/" + BUCKET + "/" + fileName;
    }
    
    // Example usage
    public static void main(String[] args) throws Exception {
        SupabaseStorageExample storage = new SupabaseStorageExample();
        
        // Example: Upload image
        long userId = 123L;
        String localImagePath = "C:\\path\\to\\your\\image.jpg"; // Change this
        
        try {
            System.out.println("Uploading image for user " + userId + "...\n");
            storage.uploadProfileImage(userId, localImagePath);
            
            System.out.println("\nPublic URL: " + storage.getPublicUrl(userId));
            
            System.out.println("\n\nDeleting image for user " + userId + "...\n");
            storage.deleteProfileImage(userId);
            
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
