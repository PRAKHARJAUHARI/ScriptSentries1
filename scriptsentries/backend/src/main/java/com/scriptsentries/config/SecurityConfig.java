package com.scriptsentries.config;

import com.scriptsentries.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    /**
     * SecurityConfig changes for V2 Project feature.
     *
     * MERGE THESE RULES into your existing SecurityConfig filterChain() method.
     * Place them BEFORE the catch-all .anyRequest().authenticated() line.
     *
     * The project-role check (ATTORNEY vs MAIN_PRODUCTION_CONTACT) is enforced
     * in ProjectService itself because Spring Security only knows about global
     * UserRole — project membership is a data-layer concern.
     *
     * Global UserRole rules being added:
     *   - POST /api/scripts/{id}/finalize  → ATTORNEY only  (finalise & lock report)
     *   - GET  /api/projects/**            → authenticated  (all members can view)
     *   - POST /api/projects/**            → ATTORNEY or ANALYST (create/assign)
     *   - PATCH /api/projects/scripts/**   → authenticated (service enforces project-role)
     */

/*
 EXAMPLE — splice into your existing SecurityConfig:

    .requestMatchers(HttpMethod.POST, "/api/scripts/{id}/finalize").hasRole("ATTORNEY")
    .requestMatchers(HttpMethod.GET,  "/api/projects/**").authenticated()
    .requestMatchers(HttpMethod.POST, "/api/projects/**").hasAnyRole("ATTORNEY", "ANALYST")
    .requestMatchers(HttpMethod.PATCH,"/api/projects/**").authenticated()

 Your existing lines stay exactly as-is. The above just insert before anyRequest().
*/


    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .anyRequest().permitAll()   // tighten to .authenticated() in production
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // --- THE FINAL CORS FIX ---
        config.setAllowedOriginPatterns(List.of(
                "http://localhost:*",                          // Keep this for local laptop testing
                "https://script-sentries1-6xy6.vercel.app"     // Your LIVE Vercel frontend!
        ));
        
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Content-Disposition")); // Important for PDF/Excel downloads
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
