const API = "http://localhost:5001/api/vendor-resources";

async function getResources(vendorId) {
  const res = await fetch(`${API}?vendorId=${vendorId}`);
  return res.json();
}

async function createResource(data) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
}

async function updateResource(id, data) {
  const res = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
}

export default {
  getResources,
  createResource,
  updateResource,
};
