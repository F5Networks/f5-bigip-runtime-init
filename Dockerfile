ARG artifactory_server
FROM ${artifactory_server}/ecosystems-cloudsolutions-docker-dev/deployment-tool:latest

# Delete their deployment files
RUN rm -r plans/

# Copy our deployment files
COPY plans/ plans/
