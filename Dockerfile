FROM node:22
RUN useradd -d /app -m -r -s /bin/bash -U klofyi
USER klofyi:klofyi
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev && npm ci --omit=dev && npm cache clean --force
COPY index.js .
COPY public ./public
EXPOSE 3000
CMD ["node", "index.js"]
