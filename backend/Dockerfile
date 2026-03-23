FROM node:20-bookworm

WORKDIR /app

# 安装编译依赖
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY package*.json ./

# 安装依赖（包括编译 sqlite3）
RUN npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "src/index.js"]
