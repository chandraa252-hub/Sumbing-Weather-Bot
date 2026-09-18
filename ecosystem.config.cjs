module.exports = {
    apps: [
        {
            name: "sumbing-weather-bot",
            script: "./dist/index.js",
            cwd: __dirname,
            interpreter: "node",
            node_args: "--enable-source-maps",
            env: {
                NODE_ENV: "production",
            },
            watch: false,
            autorestart: true,
            restart_delay: 5000,
            max_restarts: 10,
            min_uptime: "10s",
            max_memory_restart: "256M",
            kill_timeout: 10000,
            time: true,
            merge_logs: true,
            out_file: "./logs/pm2-out.log",
            error_file: "./logs/pm2-error.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        },
    ],
};