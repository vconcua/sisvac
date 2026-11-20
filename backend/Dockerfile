# ============================================================
# Dockerfile del backend SISVAC (Node.js + Express)
# Cambios respecto a la versión anterior:
#   - Node 22 (la versión con la que se probó este código; Node 18 ya no recibe soporte)
#   - Se copia también la carpeta scripts/ (antes faltaba, por eso fallaba con
#     "Cannot find module .../scripts/importar_centros_salud.js")
# ============================================================
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts

EXPOSE 4000

CMD ["node", "src/server.js"]
