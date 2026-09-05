class MetaCloudProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = "meta";
  }

  async sendBillingMessage() {
    throw new Error("MetaCloudProvider is a Phase 2 abstraction placeholder.");
  }
}

module.exports = MetaCloudProvider;
