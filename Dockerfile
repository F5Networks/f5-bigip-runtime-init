ARG artifactory_server
FROM ${artifactory_server}/ecosystems-cloudsolutions-docker-dev/deployment-tool:latest

# APK update
RUN apk add --update

RUN apk add git

# Delete their deployment files
RUN rm -r plans/

# Copy our deployment files
COPY plans/ plans/
