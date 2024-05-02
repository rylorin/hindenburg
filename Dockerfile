FROM node:20

ENV SMTPD_PORT 25

RUN apt update && apt install -y \
  netcat-traditional

WORKDIR /root
COPY package.json .
COPY yarn.lock .
RUN yarn install
COPY tsconfig.json .
COPY src/ ./src
RUN yarn build
COPY config/ ./config

EXPOSE ${SMTPD_PORT}
ENTRYPOINT [ "yarn", "start" ]

HEALTHCHECK --interval=1m CMD nc -z 127.0.0.1 ${SMTPD_PORT:-25} || exit 1
