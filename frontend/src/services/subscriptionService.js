import axios from "axios";
import API_BASE_URL from "../config";

export const getPlans = () =>
  axios.get(`${API_BASE_URL}/api/admin/plans`);

export const getVendorSubscription = (vendorId) =>
  axios.get(`${API_BASE_URL}/api/admin/vendor-subscriptions/${vendorId}`);

export const assignVendorPlan = (data) =>
  axios.post(`${API_BASE_URL}/api/admin/vendor-subscriptions`, data);

export const updateVendorSubscription = (vendorId, data) =>
  axios.put(`${API_BASE_URL}/api/admin/vendor-subscriptions/${vendorId}`, data);
