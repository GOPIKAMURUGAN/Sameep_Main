const VendorResource = require("../models/VendorResource");

exports.getVendorResources = async (req, res) => {
  try {
    const { vendorId } = req.query;

    const resources = await VendorResource.find({ vendorId }).sort({
      createdAt: -1,
    });

    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createVendorResource = async (req, res) => {
  try {
    const { vendorId, name, role, phone } = req.body;

    const resource = new VendorResource({
      vendorId,
      name,
      role,
      phone,
    });

    await resource.save();

    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVendorResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId, ...safeUpdates } = req.body || {};

    const resource = await VendorResource.findByIdAndUpdate(id, safeUpdates, {
      new: true,
    });

    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteVendorResource = async (req, res) => {
  try {
    const { id } = req.params;

    await VendorResource.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
