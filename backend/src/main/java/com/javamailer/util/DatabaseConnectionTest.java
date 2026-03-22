package com.javamailer.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Simple utility to test Supabase PostgreSQL connection
 * Run this to verify database connectivity before starting full backend
 */
public class DatabaseConnectionTest {

    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println("Testing Supabase PostgreSQL Connection");
        System.out.println("========================================\n");

        // Using PgBouncer Pooler (IPv4 compatible) instead of direct DB (IPv6 only)
        String url = "jdbc:postgresql://aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
        String user = "postgres.gksgsxkusmorkbtkjemh";
        String password = "8Qa8r5tZj5G5EGUf";

        try {
            // Load PostgreSQL driver
            System.out.println("1. Loading PostgreSQL JDBC driver...");
            Class.forName("org.postgresql.Driver");
            System.out.println("   ✓ Driver loaded successfully\n");

            // Attempt connection
            System.out.println("2. Connecting to Supabase PostgreSQL...");
            System.out.println("   URL: " + url);
            System.out.println("   User: " + user);
            
            Connection conn = DriverManager.getConnection(url, user, password);
            System.out.println("   ✓ Connection established successfully!\n");

            // Test query to verify schema
            System.out.println("3. Verifying database schema (checking tables)...");
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
            );

            System.out.println("   Tables found:\n");
            int tableCount = 0;
            while (rs.next()) {
                System.out.println("      ✓ " + rs.getString("table_name"));
                tableCount++;
            }
            System.out.println("\n   Total tables: " + tableCount + "\n");

            // Test connection metadata
            System.out.println("4. Database information:");
            System.out.println("   Database: " + conn.getMetaData().getDatabaseProductName());
            System.out.println("   Version: " + conn.getMetaData().getDatabaseProductVersion());
            System.out.println("   Driver: " + conn.getMetaData().getDriverName());
            System.out.println("   Driver Version: " + conn.getMetaData().getDriverVersion());

            // Close connection
            stmt.close();
            conn.close();

            System.out.println("\n========================================");
            System.out.println("✓ CONNECTION TEST PASSED - DB IS READY!");
            System.out.println("========================================\n");

        } catch (ClassNotFoundException e) {
            System.out.println("\n✗ ERROR: PostgreSQL JDBC driver not found!");
            System.out.println("   Make sure 'postgresql' dependency is in pom.xml");
            e.printStackTrace();
        } catch (Exception e) {
            System.out.println("\n✗ CONNECTION FAILED!");
            System.out.println("   Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
