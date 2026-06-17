FROM n8nio/n8n:latest

USER root

COPY niveshaay-pnl-pipeline.json /home/node/workflow.json
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["n8n", "start"]
