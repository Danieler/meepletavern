export const ADMIN_REQUEST_HEADER = "x-meepletavern-admin-request";
export const ADMIN_REQUEST_HEADER_VALUE = "1";

export function getAdminApiFetchHeaders() {
  return {
    "Content-Type": "application/json",
    [ADMIN_REQUEST_HEADER]: ADMIN_REQUEST_HEADER_VALUE
  };
}

export function getAdminApiRequestHeaders() {
  return {
    [ADMIN_REQUEST_HEADER]: ADMIN_REQUEST_HEADER_VALUE
  };
}
