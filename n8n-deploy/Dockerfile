FROM docker.n8n.io/n8nio/n8n:2.26.4

USER root
COPY niveshaay-pnl-pipeline.json /home/node/workflow.json
RUN chown node:node /home/node/workflow.json
USER node
