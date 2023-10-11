"""Generate extension metadata file

Example output:
{
    "components": {
        "as3": {
            "endpoints": {
                "configure": {
                    "uri": "",
                    "methods": ["GET"]
                }
            },
            "versions": {
                "1.0.0": {
                    "downloadUrl": "",
                    "packageName": "",
                    "latest": true
                }
            }
        }
    }
}
"""

import os
import re
import json
import requests
import urllib3

EXTENSION_INFO = 'extension_info.json'
GITHUB_API_ENDPOINT = 'api.github.com'
VERSION_REGEX = '[0-9]+.[0-9]+.[0-9]+'
VERSION = '1.6.2'
USER_AGENT = 'f5-bigip-runtime-init/%s' % (VERSION)
HTTP_TIMEOUT = {
    'DFL': 60
}
HTTP_VERIFY = False
ENV_VARS = {
    'LOG_LEVEL_ENV_VAR': 'F5_SDK_LOG_LEVEL',
    'DISABLE_CERT_VERIFY': 'F5_DISABLE_CERT_VERIFY'
}
GITHUB_TOKEN=os.environ.get('GITHUB_API_TOKEN')

class HTTPError(Exception):
    """ Error raised http error occurs """

class FileLoadError(Exception):
    """ Error raised if file load error occurs """

def log(message):
    """Logger

    Parameters
    ----------
    message : str
        the message to log

    Returns
    -------
    None
    """

    print(message)

# pylint: disable=too-many-locals
def make_request(host, uri, **kwargs):
    """Makes request to device (HTTP/S)

    Parameters
    ----------
    uri : str
        the URI where the request should be made
    **kwargs :
        optional keyword arguments

    Keyword Arguments
    -----------------
    port : int
        the port to use
    method : str
        the HTTP method to use
    query_parameters : dict
        the HTTP query parameters to use
    headers : str
        the HTTP headers to use (may override defaults)
    body : str
        the HTTP body to use
    body_content_type : str
        the HTTP body content type to use
    bool_response : bool
        return boolean based on HTTP success/failure
    advanced_return : bool
        return additional information, like HTTP status code to caller

    Returns
    -------
    dict
        a dictionary containing the JSON response
    """

    headers = {
        'User-Agent': USER_AGENT,
        'Authorization': 'Token ' + GITHUB_TOKEN
    }

    port = kwargs.pop('port', 443)
    method = kwargs.pop('method', 'GET').lower()
    headers.update(kwargs.pop('headers', {}))
    query_parameters = kwargs.pop('query_parameters', {})
    verify = kwargs.pop('verify', True)

    # check for body, normalize
    body = kwargs.pop('body', None)
    body_content_type = kwargs.pop('body_content_type', 'json')  # json (default), raw
    if body and body_content_type == 'json':
        headers.update({'Content-Type': 'application/json'})
        body = json.dumps(body)

    # note: certain requests *may* contain large payloads, do *not* log body
    log('Making HTTP request: %s %s' % (method.upper(), uri))

    url = 'https://%s:%s%s' % (host, port, uri)

    # suppress warning if verify is not set
    if not HTTP_VERIFY:
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    # make request
    response = requests.request(method,
                                url,
                                headers=headers,
                                params=query_parameters,
                                data=body,
                                timeout=HTTP_TIMEOUT['DFL'],
                                verify=HTTP_VERIFY)
    # return boolean response, if requested
    if kwargs.pop('bool_response', False):
        return response.ok

    status_code = response.status_code
    status_reason = response.reason

    # determine response body using the following logic
    # 1) if the content-length header exists and is 0: set to empty dict
    # 2) response is valid JSON: decode JSON to native python object (dict, list)
    headers = response.headers
    if (status_code == 204) or \
            ('content-length' in headers.keys() and headers['content-length'] == '0'):
        response_body = None
    else:
        try:
            response_body = response.json()
        except ValueError:
            response_body = {"body": response.content}


    # helpful debug
    log('HTTP response: %s %s' % (status_code, status_reason))
    log('HTTP response body: %s' % response_body)

    # raise exception on 4xx and 5xx status code(s)
    if str(status_code)[:1] in ['4', '5']:
        raise HTTPError('Bad request for URL: %s code: %s reason: %s body: %s' % (
            url, status_code, status_reason, response_body
        ))

    # optionally return tuple containing status code, response, (future)
    if kwargs.pop('advanced_return', False):
        return (response_body, status_code)

    # finally, simply return response data
    return response_body

class ExtensionScraperClient():
    """Extension scraper client

    Parameters
    ----------
    None

    Returns
    -------
    None
    """

    def __init__(self):
        self.output_file = os.path.join(os.getcwd(), 'metadata.json')

        try:
            with open(os.path.join(os.path.dirname(__file__), EXTENSION_INFO)) as m_file:
                self.extension_components = json.loads(m_file.read())
        except Exception as err:  # pylint: disable=broad-except
            raise FileLoadError(err)

    @staticmethod
    def _normalize_tag_name(tag):
        """Normalize tag name into 'x.x.x'

        Parameters
        ----------
        tag : str
            tag name

        Returns
        -------
        str
            the normalized tag name
        """

        if tag[0] == 'v':
            tag = tag[1:]

        return tag

    @staticmethod
    def _get_download_url(asset):
        """Get download URL from asset

        Parameters
        ----------
        asset : dict
            release asset or repository contents

        Returns
        -------
        str
            artifact download URL
        """

        if 'download_url' in asset:
            return asset['download_url']
        if 'browser_download_url' in asset:
            return asset['browser_download_url']
        return ''

    @staticmethod
    def _get_repo_contents(repository, tag):
        """Get repository contents (from dist folder)

        Parameters
        ----------
        repository : str
            repository name
        tag_name : str
            repository tag

        Returns
        -------
        array
            the repository contents
        """

        return make_request(
            GITHUB_API_ENDPOINT,
            '/repos/{}/contents/{}?ref={}'.format(repository, 'dist', tag)
        )

    def _parse_artifacts(self, assets, tag_name):
        """Parse artifacts

        Note: Some assets may have multiple RPM versions
        associated with a release, add an artifact for each asset
        and set an 'is_primary' flag based on tag name

        Parameters
        ----------
        assets : array
            release assets or repository contents

        Returns
        -------
        list
            artifacts information:
            [
                {
                    'url': '',
                    'is_primary': True
                }
            ]
        """

        tag_name = self._normalize_tag_name(tag_name)
        rpms = [i for i in assets if i['name'].find(".rpm") != -1
                and i['name'].find(".sha") == -1]

        artifacts = []
        for rpm in rpms:
            url = self._get_download_url(rpm)
            artifacts.append({
                'url': url,
                'is_primary': url.split('/')[:1][0].find(tag_name) != -1
            })
        return artifacts

    def _resolve_artifacts_info(self, tag_name, assets, repo_info):
        """Resolve information about artifacts, such as download URL and package name

        Attempt to resolve in the following order:
        - Github releases artifacts
        - Inside source code 'dist' folder

        Parameters
        ----------
        tag_name : str
            tag name of the release
        assets : list
            assets in the release

        Returns
        -------
        list
            the resolved artifacts information
            [{
                'download_url': '',
                'package_name': ''
            }]
        """

        # search for the artifacts information in the following order
        # - release assets
        # - 'dist' folder
        artifacts_info = self._parse_artifacts(assets, tag_name)
        if not artifacts_info: # not in release assets, try 'dist' folder
            artifacts_info = self._parse_artifacts(
                self._get_repo_contents(repo_info['repository'], tag_name),
                tag_name
            )

        if not artifacts_info:
            raise Exception('Unable to resolve artifacts info: {}'.format(artifacts_info))

        ret = []
        for artifact in artifacts_info:
            ret.append({
                'download_url': artifact['url'],
                'package_name': artifact['url'].split('/')[-1].split('.rpm')[0],
                'is_primary': artifact['is_primary']
            })
        return ret

    def _get_component_versions(self, component_info):
        """Get component versions

        Parameters
        ----------
        None

        Returns
        -------
        dict
            the component versions
            {
                '1.0.0': {
                    'downloadUrl': '',
                    'packageName': '',
                    'latest': True
                }
            }
        """

        releases = make_request(
            GITHUB_API_ENDPOINT,
            '/repos/{}/releases'.format(component_info['repository'])
        )
        latest_release_tag_name = make_request(
            GITHUB_API_ENDPOINT,
            '/repos/{}/releases/latest'.format(component_info['repository'])
        )['tag_name']

        ret = {}
        for release in releases:
            release_artifacts = self._resolve_artifacts_info(
                release['tag_name'],
                release['assets'],
                component_info
            )
            for artifact in release_artifacts:
                # - "if primary" use the release version as the key
                # - "if not primary" parse the version from the artifact package name
                if artifact['is_primary']:
                    release_version = self._normalize_tag_name(release['tag_name'])
                else:
                    release_version = re.search(VERSION_REGEX, artifact['package_name']).group(0)

                ret[release_version] = {
                    'downloadUrl': artifact['download_url'],
                    'packageName': artifact['package_name'],
                    'latest': latest_release_tag_name == release['tag_name']
                }
        return ret

    def generate_metadata(self, **kwargs):
        """Generate metadata and save to output file

        Parameters
        ----------
        **kwargs :
            optional keyword arguments

        Keyword Arguments
        -----------------
        write_file : bool
            specify whether file should be written to disk

        Returns
        -------
        dict
            generated metadata
        """

        write_file = kwargs.pop('write_file', True)

        metadata = {
            'components': {}
        }

        for component, info in self.extension_components.items():
            metadata['components'][component] = {
                'endpoints': info['endpoints'],
                'versions': self._get_component_versions(info),
                'componentDependencies': info['componentDependencies']
            }

        if write_file:
            log('Writing metadata file to {}'.format(self.output_file))
            with open(self.output_file, 'w+') as output_file:
                output_file.write(json.dumps(metadata, indent=4))

        return metadata


if __name__ == "__main__":
    TCS_CLIENT = ExtensionScraperClient()
    TCS_CLIENT.generate_metadata()