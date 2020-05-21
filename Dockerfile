FROM artifactory.f5net.com/ecosystems-cloudsolutions-docker-dev/deployment-tool:latest

# Set work directory
WORKDIR /deployment-tool

# Copy deployment files
COPY plans/ /