package com.thejas.backend_mini_mindforge.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DataSourceConfig {

    @Value("${spring.datasource.url}")
    private String rawUrl;

    @Value("${spring.datasource.username:}")
    private String username;

    @Value("${spring.datasource.password:}")
    private String password;

    @Bean
    public DataSource dataSource() throws Exception {
        HikariDataSource ds = new HikariDataSource();

        // Render provides: postgresql://user:pass@host:port/dbname
        if (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://")) {
            ds.setDriverClassName("org.postgresql.Driver");
            URI uri = new URI(rawUrl.replace("postgres://", "postgresql://"));
            int port = uri.getPort() == -1 ? 5432 : uri.getPort();
            String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getPath();
            ds.setJdbcUrl(jdbcUrl);
            if (uri.getUserInfo() != null) {
                String[] userInfo = uri.getUserInfo().split(":", 2);
                ds.setUsername(userInfo[0]);
                ds.setPassword(userInfo.length > 1 ? userInfo[1] : "");
            } else {
                ds.setUsername(username);
                ds.setPassword(password);
            }
        } else if (rawUrl.startsWith("jdbc:mysql://")) {
            ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
            ds.setJdbcUrl(rawUrl);
            ds.setUsername(username);
            ds.setPassword(password);
        } else {
            // jdbc:postgresql:// format
            ds.setDriverClassName("org.postgresql.Driver");
            ds.setJdbcUrl(rawUrl);
            ds.setUsername(username);
            ds.setPassword(password);
        }

        return ds;
    }
}
