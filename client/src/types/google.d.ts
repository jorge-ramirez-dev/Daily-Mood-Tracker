declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(): void;
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
  }

  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }): TokenClient;

  function revoke(token: string): void;
}

declare namespace gapi {
  function load(api: string, callback: () => void): void;

  namespace client {
    function init(config: object): Promise<void>;
    function load(api: string, version: string): Promise<void>;
    function setToken(token: { access_token: string }): void;
    function request(config: {
      path: string;
      method: string;
      params?: object;
      body?: string;
    }): Promise<{ body: string }>;

    namespace drive {
      namespace files {
        function list(params: object): Promise<{ result: { files?: { id?: string }[] } }>;
        function get(params: { fileId: string; alt?: string }): Promise<{ body: string }>;
      }
    }
  }
}
