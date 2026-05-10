import { apiRequest } from "../lib/api";

type OtpPayload = {
  countryCode: string;
  phone: string;
};

type VerifyOtpPayload = OtpPayload & {
  otp: string;
};

type VerifyOtpResponse = {
  message: string;
  token?: string;
  role?: string;
  displayName?: string;
  customer?: {
    _id: string;
    countryCode: string;
    phone: string;
    fullNumber: string;
  };
  session?: {
    _id: string;
    vendorId?: string;
    categoryId?: string;
  };
};

type SessionContextResponse = {
  role: string;
  displayName: string;
  customer: {
    _id: string;
    countryCode: string;
    phone: string;
    fullNumber: string;
  };
  vendor: null | {
    _id: string;
    businessName: string;
    categoryId: string;
    status: string;
    subdomain: string;
    customDomain: string;
  };
};

export function requestOtp(payload: OtpPayload) {
  return apiRequest<{ message: string }>("/api/customers/request-otp", {
    method: "POST",
    body: payload,
  });
}

export function verifyOtp(payload: VerifyOtpPayload) {
  return apiRequest<VerifyOtpResponse>("/api/customers/verify-otp", {
    method: "POST",
    body: payload,
  });
}

export function bypassOtp(payload: OtpPayload) {
  return apiRequest<VerifyOtpResponse>("/api/customers/bypass-otp", {
    method: "POST",
    body: payload,
  });
}

export function fetchSessionContext(token: string) {
  return apiRequest<SessionContextResponse>("/api/customers/session-context", {
    method: "GET",
    token,
  });
}
