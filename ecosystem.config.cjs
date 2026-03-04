module.exports = {
  apps: [{
    name: "boss-cloaker",
    script: "dist/index.cjs",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "512M",
    error_file: "./logs/error.log",
    out_file: "./logs/output.log",
    merge_logs: true,
    time: true,
  }],
};
