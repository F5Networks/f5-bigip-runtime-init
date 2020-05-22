FROM artifactory.f5net.com/ecosystems-cloudsolutions-docker-dev/deployment-tool:latest

# Delete their deployment files
RUN rm -r plans/

# Copy our deployment files
COPY plans/ plans/