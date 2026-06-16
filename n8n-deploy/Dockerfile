FROM n8nio/n8n:latest

USER root

COPY niveshaay-pnl-pipeline.json /home/node/workflow.json
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Run as root throughout — keeps things simple across n8n image versions
# and works with Railway's root-owned volume mount.
ENTRYPOINT ["/entrypoint.sh"]
CMD ["n8n", "start"]
