import axios from "axios";
import API_BASE_URL from "../config";

const BASE = API_BASE_URL ? `${API_BASE_URL}/api/admin/plans` : "/api/admin/plans";

export async function getPlans() {
  const res = await axios.get(BASE);
  return res.data;
}

export async function createPlan(data) {
  const res = await axios.post(BASE, data);
  return res.data;
}

export async function updatePlan(id, data) {
  const res = await axios.put(`${BASE}/${id}`, data);
  return res.data;
}

export async function deletePlan(id) {
  const res = await axios.delete(`${BASE}/${id}`);
  return res.data;
}
