FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=8000
EXPOSE 8000
CMD ["node", "src/server.js"]